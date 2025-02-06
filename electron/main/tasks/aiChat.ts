import { createLogger } from '#/logger'
import { ipcMain } from 'electron'
import OpenAI from 'openai'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { providers } from 'shared/providers'

export function setupAIChat() {
  const logger = createLogger('ai对话')

  ipcMain.handle(IPC_CHANNELS.tasks.aiChat.chat, async (event, { messages, apiKey, provider, model }) => {
    const { baseURL } = providers[provider as keyof typeof providers]
    try {
      const openai = new OpenAI({
        apiKey,
        baseURL,
      })
      logger.info('正在向 AI 提问……')
      const stream = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
      })

      let chunkCount = 0
      let isStart = false
      for await (const chunk of stream) {
        if (!isStart) {
          logger.info('AI 开始回答……')
          isStart = true
        }
        const delta = chunk.choices[0]?.delta
        if (delta) {
          const { content, reasoning_content } = delta as any
          if (content) {
            event.sender.send(IPC_CHANNELS.tasks.aiChat.stream, {
              chunk: content,
              type: 'content',
              index: chunkCount++,
            })
          }
          if (reasoning_content) {
            event.sender.send(IPC_CHANNELS.tasks.aiChat.stream, {
              chunk: reasoning_content,
              type: 'reasoning',
              index: chunkCount++,
            })
          }
        }
      }

      event.sender.send(IPC_CHANNELS.tasks.aiChat.stream, { done: true })
      return { success: true }
    }
    catch (error) {
      logger.error('AI 不想回答')
      let errorMessage = '请求AI失败'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      else {
        errorMessage = error as string
      }
      event.sender.send(IPC_CHANNELS.tasks.aiChat.error, {
        error: errorMessage,
      })
    }
    finally {
      logger.info('AI 回答结束')
    }
  })
}
