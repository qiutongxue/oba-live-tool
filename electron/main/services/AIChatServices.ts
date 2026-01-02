import OpenAI, { AuthenticationError, NotFoundError } from 'openai'
import { providers } from 'shared/providers'
import { createLogger } from '#/logger'

type ProviderType = keyof typeof providers

interface ChatMessage {
  role: 'assistant' | 'system' | 'user'
  content: string
}

const checkAPIKeyErrors = {
  NotFoundError: '目标平台不支持测试 API KEY，你可以跳过测试直接使用',
  AuthenticationError: 'API KEY 验证失败，请确认是否输入正确',
  UnknownError: '未知错误',
} as const

interface CheckAPIKeySuccess {
  kind: 'success'
}

interface CheckAPIKeyFail {
  kind: 'fail'
  type: keyof typeof checkAPIKeyErrors
  message?: string
}

type CheckAPIKeyResult = CheckAPIKeySuccess | CheckAPIKeyFail

export class AIChatService {
  private logger: ReturnType<typeof createLogger> = createLogger('AI对话')
  private openai: OpenAI
  private constructor(
    private apiKey: string,
    private baseURL: string,
    private provider: ProviderType,
  ) {
    this.openai = new OpenAI({ apiKey, baseURL })
  }

  public static createService(apiKey: string, provider: ProviderType, customBaseURL?: string) {
    let baseURL: string
    if (provider === 'custom') {
      if (!customBaseURL) {
        throw new Error('使用自定义 provider 请提供 baseURL')
      }
      baseURL = customBaseURL
    } else {
      baseURL = providers[provider].baseURL
    }

    return new AIChatService(apiKey, baseURL, provider)
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
        const { content, reasoning_content: reasoning } = delta as typeof delta & {
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
    let result: CheckAPIKeyResult
    if (this.provider === 'openrouter') {
      result = await this.checkOpenRouterAPIKey()
    } else {
      result = await this.checkDefaultAPIKey()
    }

    if (result.kind === 'fail') {
      switch (result.type) {
        case 'NotFoundError':
          this.logger.error(checkAPIKeyErrors.NotFoundError)
          throw new Error(checkAPIKeyErrors.NotFoundError)
        case 'AuthenticationError':
          this.logger.error(checkAPIKeyErrors.AuthenticationError)
          throw new Error(checkAPIKeyErrors.AuthenticationError)
        default: {
          const errorMessage = `${checkAPIKeyErrors.UnknownError}: ${result.message}`
          this.logger.error(errorMessage)
          throw new Error(errorMessage)
        }
      }
    }

    this.logger.success('API Key 通过测试！你的 API Key 大概率是有效的')
  }

  private async checkDefaultAPIKey(): Promise<CheckAPIKeyResult> {
    try {
      await this.openai.models.list()
      return {
        kind: 'success',
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          kind: 'fail',
          type: 'NotFoundError',
        }
      }
      if (error instanceof AuthenticationError) {
        return {
          kind: 'fail',
          type: 'AuthenticationError',
        }
      }
      return {
        kind: 'fail',
        type: 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async checkOpenRouterAPIKey(): Promise<CheckAPIKeyResult> {
    const url = `${providers.openrouter.baseURL}/credits`
    const options = {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    }
    const resp = await fetch(url, options)
    const data = await resp.json()
    switch (resp.status) {
      case 200:
        return {
          kind: 'success',
        }
      case 401: {
        return {
          kind: 'fail',
          type: 'AuthenticationError',
        }
      }
      default: {
        return {
          kind: 'fail',
          type: 'UnknownError',
          message: `${data?.error?.message}, CODE: ${data?.error?.code}`,
        }
      }
    }
  }
}
