import { createLogger } from '#/logger'
import { ipcMain } from 'electron'
import OpenAI from 'openai'

export function setupAIChat() {
  const logger = createLogger('aiChat')

  ipcMain.handle('ai-chat', async (_, { messages, apiKey, model }) => {
    try {
      const openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com',
      })

      const completion = await openai.chat.completions.create({
        model: model ?? 'deepseek-chat',
        messages,
      })

      if (!completion.choices) {
        throw new Error(JSON.stringify(completion))
      }

      return {
        success: true,
        message: completion.choices[0].message.content,
      }
    }
    catch (error) {
      logger.error('请求AI失败')

      return {
        success: false,
        error: (error as Error).message,
      }
    }
  })
}
