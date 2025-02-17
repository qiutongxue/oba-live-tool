import { eventEmitter, EVENTS } from '@/utils/events'
import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

export interface Message {
  id: string
  content: string
  pinTop: boolean
}

interface AutoMessageConfig {
  scheduler: {
    interval: [number, number] // [最小间隔, 最大间隔]
  }
  messages: Message[]
  random: boolean
}

interface AutoMessageContext {
  isRunning: boolean
  config: AutoMessageConfig
}

const defaultContext: AutoMessageContext = {
  isRunning: false,
  config: {
    scheduler: {
      interval: [30000, 60000],
    },
    messages: [],
    random: false,
  },
}

interface AutoMessageStore {
  contexts: Record<string, AutoMessageContext>
  setIsRunning: (accountId: string, running: boolean) => void
  setConfig: (accountId: string, config: Partial<AutoMessageConfig>) => void
}

export const useAutoMessageStore = create<AutoMessageStore>()(
  persist(
    immer((set) => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set((state) => {
          delete state.contexts[accountId]
        })
      })

      return {
        contexts: { default: defaultContext },
        setIsRunning: (accountId, running) => set((state) => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext
          }
          state.contexts[accountId].isRunning = running
        }),
        setConfig: (accountId, config) => set((state) => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext
          }
          state.contexts[accountId].config = {
            ...state.contexts[accountId].config,
            ...config,
          }
        }),
      }
    }),
    {
      name: 'auto-message-storage',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          try {
            const persisted = persistedState as {
              config: {
                scheduler: { interval: [number, number] }
                messages: string[]
                pinTops: number[]
                random: boolean
              }
            }
            const messages = persisted.config.messages.map((message, index) => ({
              id: crypto.randomUUID(),
              content: message as string,
              pinTop: persisted.config.pinTops.includes(index),
            }))
            return {
              contexts: {
                default: {
                  config: {
                    scheduler: persisted.config.scheduler,
                    messages,
                    random: persisted.config.random,
                  },
                },
              },
            }
          }
          catch {
            return {
              contexts: {
                default: defaultContext,
              },
            }
          }
        }
      },
      partialize: state => ({
        contexts: Object.fromEntries(
          Object.entries(state.contexts).map(([accountId, context]) =>
            // [accountId, context { isRunning, config }]
            [accountId, Object.fromEntries(
              Object.entries(context).filter(([key]) => key !== 'isRunning'),
            )],
          ),
        ),
      }),
    },
  ),
)

export function useAutoMessage() {
  const store = useAutoMessageStore()
  const { toast } = useToast()
  const { currentAccountId } = useAccounts()

  // 获取当前账号的完整状态
  const context = store.contexts[currentAccountId] || defaultContext

  const updateConfig = (newConfig: Partial<AutoMessageConfig>) => {
    store.setConfig(currentAccountId, newConfig)
  }

  useEffect(() => {
    const handleTaskStop = (accountId: string) => {
      store.setIsRunning(accountId, false)
      toast.error('自动发言已停止')
    }

    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.tasks.autoMessage.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [store, toast])

  return {
    isRunning: context.isRunning,
    config: context.config,
    setIsRunning: (running: boolean) => store.setIsRunning(currentAccountId, running),
    setScheduler: (scheduler: AutoMessageConfig['scheduler']) =>
      updateConfig({ scheduler }),
    setMessages: (messages: Message[]) =>
      updateConfig({ messages }),
    setRandom: (random: boolean) =>
      updateConfig({ random }),
  }
}
