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

type AIProvider = 'deepseek' | 'openrouter'

interface APIKeys {
  deepseek: string
  openrouter: string
}

interface AIChat {
  messages: ChatMessage[]
  isLoading: boolean
  apiKeys: APIKeys
  provider: AIProvider
  setProvider: (provider: AIProvider) => void
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
        provider: 'deepseek',
        apiKeys: {
          deepseek: '',
          openrouter: '',
        },
        setApiKey: (provider, key) => {
          set((state) => {
            state.apiKeys[provider] = key
          })
        },
        setProvider: (provider) => {
          set((state) => {
            state.provider = provider
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
      partialize: state => ({ apiKeys: state.apiKeys, provider: state.provider }),
    },
  ),
)
