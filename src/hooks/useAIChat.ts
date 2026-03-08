import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning_content?: string
  timestamp: number
  isError?: boolean
}

type Status = 'ready' | 'waiting' | 'replying'

interface AIChatStore {
  messages: ChatMessage[]
  status: Status
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
  immer(set => {
    return {
      messages: [],
      status: 'ready',
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
          if (state.messages[state.messages.length - 1]?.role !== 'assistant') {
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
          if (state.messages[state.messages.length - 1]?.role !== 'assistant') {
            state.messages.push({
              role: 'assistant',
              reasoning_content: chunk,
              content: '',
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            })
          } else {
            state.messages[state.messages.length - 1].reasoning_content += chunk
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
)
