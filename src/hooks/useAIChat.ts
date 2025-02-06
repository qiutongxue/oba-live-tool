import { providers } from 'shared/providers'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning_content?: string
  timestamp: number
  isError?: boolean
}

export type AIProvider = keyof typeof providers

type APIKeys = {
  [key in AIProvider]: string
}

interface ProviderConfig {
  provider: AIProvider
  model: string
  modelPreferences: {
    [key in AIProvider]: string
  }
}

interface AIChat {
  messages: ChatMessage[]
  isLoading: boolean
  apiKeys: APIKeys
  config: ProviderConfig
  setConfig: (config: Partial<ProviderConfig>) => void
  setApiKey: (provider: AIProvider, key: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  appendToChat: (chunk: string) => void
  appendToReasoning: (chunk: string) => void
  tryToHandleEmptyMessage: (message: string) => void
  setMessages: (messages: ChatMessage[]) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useAIChatStore = create<AIChat>()(
  persist(
    immer((set) => {
      return {
        messages: [],
        isLoading: false,
        config: {
          provider: 'deepseek',
          model: providers.deepseek.models[0],
          modelPreferences: {
            deepseek: providers.deepseek.models[0],
            openrouter: providers.openrouter.models[0],
          },
        },
        apiKeys: {
          deepseek: '',
          openrouter: '',
        },
        setConfig: (config) => {
          set((state) => {
            if (config.provider) {
              const newModel = config.model || state.config.modelPreferences[config.provider]
              state.config.provider = config.provider
              state.config.model = newModel
              state.config.modelPreferences[config.provider] = newModel
            }
            else if (config.model) {
              state.config.model = config.model
              state.config.modelPreferences[state.config.provider] = config.model
            }
          })
        },
        setApiKey: (provider, key) => {
          set((state) => {
            state.apiKeys[provider] = key
          })
        },
        addMessage: (message) => {
          set((state) => {
            state.messages.push({
              ...message,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            })
          })
        },
        appendToChat: (chunk) => {
          set((state) => {
            if (state.messages[state.messages.length - 1].role !== 'assistant') {
              state.messages.push({ role: 'assistant', content: chunk, id: crypto.randomUUID(), timestamp: Date.now() })
            }
            else {
              state.messages[state.messages.length - 1].content += chunk
            }
          })
        },
        appendToReasoning: (chunk) => {
          set((state) => {
            if (state.messages[state.messages.length - 1].role !== 'assistant') {
              state.messages.push({ role: 'assistant', reasoning_content: chunk, content: '', id: crypto.randomUUID(), timestamp: Date.now() })
            }
            else {
              state.messages[state.messages.length - 1].reasoning_content += chunk
            }
          })
        },
        tryToHandleEmptyMessage: (message) => {
          set((state) => {
            const lastRole = state.messages[state.messages.length - 1]?.role
            if (!lastRole || lastRole === 'user') {
              state.messages.push({ role: 'assistant', content: message, id: crypto.randomUUID(), timestamp: Date.now(), isError: true })
            }
          })
        },
        setMessages: (messages) => {
          set((state) => {
            state.messages = messages
          })
        },
        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading
          })
        },
        clearMessages: () => {
          set((state) => {
            state.messages = []
          })
        },
      }
    }),
    {
      name: 'ai-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ apiKeys: state.apiKeys, config: state.config }),
    },
  ),
)
