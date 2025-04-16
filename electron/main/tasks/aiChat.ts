import { ipcMain } from 'electron'
import OpenAI from 'openai'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { providers } from 'shared/providers'
import { createLogger } from '#/logger'
import { typedIpcMainHandle } from '#/utils'

const logger = createLogger('ai对话')

interface StreamChunk {
  chunk: string
  type: 'content' | 'reasoning'
  index: number
}

function createOpenAIClient(
  apiKey: string,
  provider: keyof typeof providers,
  customBaseURL?: string,
) {
  const baseURL =
    provider === 'custom' ? customBaseURL : providers[provider].baseURL
  return new OpenAI({ apiKey, baseURL })
}

async function handleStreamResponse(
  stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
  sender: Electron.WebContents,
) {
  let chunkCount = 0
  let isStart = false

  for await (const chunk of stream) {
    if (!isStart) {
      logger.info('AI 开始回答……')
      isStart = true
    }

    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    sendStreamChunk(delta, chunkCount++, sender)
  }

  sender.send(IPC_CHANNELS.tasks.aiChat.stream, { done: true })
}

function sendStreamChunk(
  delta: OpenAI.Chat.ChatCompletionChunk['choices'][0]['delta'] & {
    reasoning_content?: string
  },
  index: number,
  sender: Electron.WebContents,
) {
  const { content, reasoning_content } = delta

  if (content) {
    const chunk: StreamChunk = { chunk: content, type: 'content', index }
    sender.send(IPC_CHANNELS.tasks.aiChat.stream, chunk)
  }

  if (reasoning_content) {
    const chunk: StreamChunk = {
      chunk: reasoning_content,
      type: 'reasoning',
      index,
    }
    sender.send(IPC_CHANNELS.tasks.aiChat.stream, chunk)
  }
}

function handleError(error: unknown, sender: Electron.WebContents) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`AI 不想回答：${errorMessage}`)
  sender.send(IPC_CHANNELS.tasks.aiChat.error, { error: errorMessage })
}

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.aiChat.chat,
    async (event, { messages, apiKey, provider, model, customBaseURL }) => {
      try {
        const openai = createOpenAIClient(apiKey, provider, customBaseURL)
        logger.info('正在向 AI 提问……')

        const stream = await openai.chat.completions.create({
          model,
          messages,
          stream: true,
        })

        await handleStreamResponse(stream, event.sender)
      } catch (error) {
        handleError(error, event.sender)
      } finally {
        logger.info('AI 回答结束')
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.aiChat.normalChat,
    async (event, { messages, apiKey, provider, model, customBaseURL }) => {
      try {
        const openai = createOpenAIClient(apiKey, provider, customBaseURL)
        logger.debug('[normal] AI 回答开始')
        const response = await openai.chat.completions.create({
          model,
          messages,
        })
        const reply = response.choices?.[0]?.message?.content
        logger.info(`[normal] ${reply}`)
        return reply
      } catch (error) {
        handleError(error, event.sender)
      } finally {
        logger.debug('[normal] AI 回答结束')
      }
      return null
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.aiChat.testApiKey,
    async (event, { apiKey, provider, customBaseURL }) => {
      try {
        const client = createOpenAIClient(apiKey, provider, customBaseURL)

        logger.info(
          `正在测试 ${provider === 'custom' ? customBaseURL : provider} 的API连接...`,
        )
        await client.models.list()
        logger.info('API连接成功')

        return {
          success: true,
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        logger.error(`API连接测试失败: ${errorMessage}`)
        return {
          success: false,
          error: errorMessage,
        }
      }
    },
  )
}

setupIpcHandlers()
