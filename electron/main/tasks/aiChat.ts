import { createLogger } from '#/logger'
import { ipcMain } from 'electron'
import OpenAI from 'openai'

export function setupAIChat() {
  const logger = createLogger('aiChat')

  const openai = new OpenAI({
    apiKey: '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',
    baseURL: 'https://openrouter.ai/api/v1',
  })

  ipcMain.handle('ai-chat', async (_, message: string) => {
    try {
      const completion = await openai.chat.completions.create({
        model: 'deepseek/deepseek-r1:free',
        messages: [{ role: 'user', content: message }],
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
