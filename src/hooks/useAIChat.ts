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

interface AIChat {
  messages: ChatMessage[]
  isLoading: boolean
  apiKey: string
  setApiKey: (key: string) => void
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
        apiKey: '',
        setApiKey: (key) => {
          set((state) => {
            state.apiKey = key
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
      partialize: state => ({ apiKey: state.apiKey }), // 只持久化 apiKey
    },
  ),
)
