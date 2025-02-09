import { createLogger } from '#/logger'
import { ipcMain } from 'electron'
import OpenAI from 'openai'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { providers } from 'shared/providers'

const logger = createLogger('ai对话')

interface StreamChunk {
  chunk: string
  type: 'content' | 'reasoning'
  index: number
}

function createOpenAIClient(apiKey: string, provider: keyof typeof providers) {
  const { baseURL } = providers[provider]
  return new OpenAI({ apiKey, baseURL })
}

async function handleStreamResponse(stream: AsyncIterable<any>, sender: Electron.WebContents) {
  let chunkCount = 0
  let isStart = false

  for await (const chunk of stream) {
    if (!isStart) {
      logger.info('AI 开始回答……')
      isStart = true
    }

    const delta = chunk.choices[0]?.delta
    if (!delta)
      continue

    sendStreamChunk(delta, chunkCount++, sender)
  }

  sender.send(IPC_CHANNELS.tasks.aiChat.stream, { done: true })
}

function sendStreamChunk(delta: any, index: number, sender: Electron.WebContents) {
  const { content, reasoning_content } = delta

  if (content) {
    const chunk: StreamChunk = { chunk: content, type: 'content', index }
    sender.send(IPC_CHANNELS.tasks.aiChat.stream, chunk)
  }

  if (reasoning_content) {
    const chunk: StreamChunk = { chunk: reasoning_content, type: 'reasoning', index }
    sender.send(IPC_CHANNELS.tasks.aiChat.stream, chunk)
  }
}

function handleError(error: unknown, sender: Electron.WebContents) {
  logger.error('AI 不想回答')
  const errorMessage = error instanceof Error ? error.message : String(error)
  sender.send(IPC_CHANNELS.tasks.aiChat.error, { error: errorMessage })
}

export function setupAIChat() {
  ipcMain.handle(
    IPC_CHANNELS.tasks.aiChat.chat,
    async (event, { messages, apiKey, provider, model }) => {
      try {
        const openai = createOpenAIClient(apiKey, provider)
        logger.info('正在向 AI 提问……')

        const stream = await openai.chat.completions.create({
          model,
          messages,
          stream: true,
        })

        await handleStreamResponse(stream, event.sender)
        return { success: true }
      }
      catch (error) {
        handleError(error, event.sender)
      }
      finally {
        logger.info('AI 回答结束')
      }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.tasks.aiChat.normalChat,
    async (event, { messages, apiKey, provider, model }) => {
      try {
        const openai = createOpenAIClient(apiKey, provider)
        logger.debug('[normal] AI 回答开始')
        const response = await openai.chat.completions.create({
          model,
          messages,
        })
        const reply = response.choices?.[0]?.message?.content
        logger.info(`[normal] ${reply}`)
        return reply
      }
      catch (error) {
        logger.error('[normal] AI 拒绝回答')
        handleError(error, event.sender)
      }
      finally {
        logger.debug('[normal] AI 回答结束')
      }
    },
  )
}
