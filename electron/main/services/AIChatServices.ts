import OpenAI, { OpenAIError } from 'openai'
import { providers } from 'shared/providers'
import { createLogger } from '#/logger'

type ProviderType = keyof typeof providers

interface ChatMessage {
  role: 'assistant' | 'system' | 'user'
  content: string
}

export class AIChatService {
  private logger: ReturnType<typeof createLogger> = createLogger('AI对话')
  private openai: OpenAI
  private constructor(apiKey: string, baseURL: string) {
    this.openai = new OpenAI({ apiKey, baseURL })
  }

  public static createService(
    apiKey: string,
    provider: ProviderType,
    customBaseURL?: string,
  ) {
    let baseURL: string
    if (provider === 'custom') {
      if (!customBaseURL) {
        throw new Error('使用自定义 provider 请提供 baseURL')
      }
      baseURL = customBaseURL
    } else {
      baseURL = providers[provider].baseURL
    }

    return new AIChatService(apiKey, baseURL)
  }

  public async *chatStream(messages: ChatMessage[], model: string) {
    try {
      this.logger.debug('流式 chatStream 请求', { model })
      const stream = await this.openai.chat.completions.create({
        model,
        messages,
        stream: true,
      })

      let contentLength = 0
      let reasoningLength = 0

      for await (const chunk of stream) {
        const delta = chunk.choices[0].delta
        const { content, reasoning_content: reasoning } =
          delta as typeof delta & {
            reasoning_content?: string
          }

        contentLength += content?.length ?? 0
        reasoningLength += reasoning?.length ?? 0

        if (content || reasoning) {
          yield { content, reasoning }
        }
      }

      this.logger.debug('chatStream 响应完成', {
        contentLength,
        reasoningLength,
      })
    } catch (error) {
      this.logger.error('AI 不想回答：chatStream 错误', error)
      throw error
    }
  }

  public async chat(messages: ChatMessage[], model: string) {
    try {
      this.logger.debug('非流式 chat 请求', { model })

      const response = await this.openai.chat.completions.create({
        model,
        messages,
        stream: false,
      })

      const output = response.choices[0].message.content ?? ''

      this.logger.debug('chat 响应完成', { outputLength: output.length })

      return output
    } catch (error) {
      this.logger.error('AI 不想回答：chat 错误', error)
      throw error
    }
  }

  public async checkAPIKey() {
    try {
      await this.openai.models.list()
    } catch (error) {
      this.logger.error(
        'APIKEY 测试失败，可能是 APIKEY 无效，也可能平台或网络等原因',
        error,
      )
      throw error
    }
  }
}
