import { providers } from 'shared/providers'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning_content?: string
  timestamp: number
  isError?: boolean
}

export type AIProvider = keyof typeof providers | 'custom'

type APIKeys = {
  [key in AIProvider]: string
}

export interface ProviderConfig {
  provider: AIProvider
  model: string
  modelPreferences: {
    [key in AIProvider]: string
  }
}

type Status = 'ready' | 'waiting' | 'replying'
interface AIChat {
  messages: ChatMessage[]
  status: Status
  apiKeys: APIKeys
  config: ProviderConfig
  customBaseURL: string
  setCustomBaseURL: (url: string) => void
  setConfig: (config: Partial<ProviderConfig>) => void
  setApiKey: (provider: AIProvider, key: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  appendToChat: (chunk: string) => void
  appendToReasoning: (chunk: string) => void
  tryToHandleEmptyMessage: (message: string) => void
  setMessages: (messages: ChatMessage[]) => void
  setStatus: (status: Status) => void
  clearMessages: () => void
}

interface AIChatStore {
  messages: ChatMessage[]
  status: Status
  apiKeys: APIKeys
  config: ProviderConfig
  customBaseURL: string
  setCustomBaseURL: (url: string) => void
  setConfig: (config: Partial<ProviderConfig>) => void
  setApiKey: (provider: AIProvider, key: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  appendToChat: (chunk: string) => void
  appendToReasoning: (chunk: string) => void
  tryToHandleEmptyMessage: (message: string) => void
  setMessages: (messages: ChatMessage[]) => void
  setStatus: (status: Status) => void
  clearMessages: () => void
  autoScroll: boolean
  setAutoScroll: (value: boolean) => void
}

export const useAIChatStore = create<AIChatStore>()(
  persist(
    immer(set => {
      const modelPreferences = Object.keys(providers).reduce(
        (acc, provider) => {
          acc[provider as AIProvider] =
            providers[provider as keyof typeof providers].models[0] || ''
          return acc
        },
        {} as Record<AIProvider, string>,
      )

      const apiKeys = Object.keys(providers).reduce(
        (acc, provider) => {
          acc[provider as AIProvider] = ''
          return acc
        },
        {} as Record<AIProvider, string>,
      )

      return {
        messages: [],
        status: 'ready',
        config: {
          provider: 'deepseek',
          model: providers.deepseek.models[0],
          modelPreferences,
        },
        apiKeys,
        customBaseURL: '',
        setCustomBaseURL: url => {
          set(state => {
            state.customBaseURL = url
          })
        },
        setConfig: config => {
          set(state => {
            if (config.provider) {
              const newModel =
                config.model || state.config.modelPreferences[config.provider]
              state.config.provider = config.provider
              state.config.model = newModel
              state.config.modelPreferences[config.provider] = newModel
            } else if (config.model) {
              state.config.model = config.model
              state.config.modelPreferences[state.config.provider] =
                config.model
            }
          })
        },
        setApiKey: (provider, key) => {
          set(state => {
            state.apiKeys[provider] = key
          })
        },
        addMessage: message => {
          set(state => {
            state.messages.push({
              ...message,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            })
          })
        },
        appendToChat: chunk => {
          set(state => {
            if (
              state.messages[state.messages.length - 1].role !== 'assistant'
            ) {
              state.messages.push({
                role: 'assistant',
                content: chunk,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
              })
            } else {
              state.messages[state.messages.length - 1].content += chunk
            }
          })
        },
        appendToReasoning: chunk => {
          set(state => {
            if (
              state.messages[state.messages.length - 1].role !== 'assistant'
            ) {
              state.messages.push({
                role: 'assistant',
                reasoning_content: chunk,
                content: '',
                id: crypto.randomUUID(),
                timestamp: Date.now(),
              })
            } else {
              state.messages[state.messages.length - 1].reasoning_content +=
                chunk
            }
          })
        },
        tryToHandleEmptyMessage: message => {
          set(state => {
            const lastRole = state.messages[state.messages.length - 1]?.role
            if (!lastRole || lastRole === 'user') {
              state.messages.push({
                role: 'assistant',
                content: message,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                isError: true,
              })
            }
          })
        },
        setMessages: messages => {
          set(state => {
            state.messages = messages
          })
        },
        setStatus: status => {
          set(state => {
            state.status = status
          })
        },
        clearMessages: () => {
          set(state => {
            state.messages = []
          })
        },
        autoScroll: true,
        setAutoScroll: value => set({ autoScroll: value }),
      }
    }),
    {
      name: 'ai-chat-storage',
      partialize: state => ({
        apiKeys: state.apiKeys,
        config: state.config,
        customBaseURL: state.customBaseURL,
      }),
    },
  ),
)
