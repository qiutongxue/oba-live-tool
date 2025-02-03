import { createLogger } from '#/logger'
import { ipcMain } from 'electron'
import OpenAI from 'openai'

const providers = {
  deepseek: {
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-reasoner',
  },
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-r1:free',
  },
}

export function setupAIChat() {
  const logger = createLogger('aiChat')

  ipcMain.handle('ai-chat', async (_, { messages, apiKey, provider }) => {
    const { baseURL, model } = providers[provider as keyof typeof providers]
    try {
      const openai = new OpenAI({
        apiKey,
        baseURL,
      })

      const completion = await openai.chat.completions.create({
        model,
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
