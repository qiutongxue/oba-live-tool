import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
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
