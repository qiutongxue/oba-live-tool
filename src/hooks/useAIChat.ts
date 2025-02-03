import { create } from 'zustand'
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
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useAIChatStore = create<AIChat>()(immer((set) => {
  return {
    messages: [],
    isLoading: false,
    addMessage: (message) => {
      set((state) => {
        state.messages.push({
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        })
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
}))
