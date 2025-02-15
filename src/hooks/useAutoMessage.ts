import { eventEmitter, EVENTS } from '@/utils/events'
import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
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
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          if (key === 'state') {
            const oldState = value as { config: AutoMessageConfig }
            // 检查是否是旧版本的数据结构（通过检查是否存在 config 字段）
            let messages = oldState.config.messages as unknown[]
            if (typeof messages[0] === 'string') {
              // 旧的 messages 是字符串，迁移到新的数据结构
              messages = messages.map(message => ({
                id: crypto.randomUUID(),
                content: message as string,
                pinTop: false,
              }))
            }
            if (oldState && oldState.config && !('contexts' in oldState)) {
              // 迁移到新的数据结构
              return {
                contexts: {
                  default: {
                    config: {
                      ...oldState.config,
                      messages,
                    },
                  },
                },
              }
            }
          }
          return value
        },
      }),
      partialize: state => ({
        contexts: Object.fromEntries(
          // [default, { isRunning: x }]
          Object.entries(state.contexts).map(([key, value]) =>
            [key, Object.fromEntries(
              Object.entries(value).filter(([key]) => key !== 'isRunning'),
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
    const handleTaskStop = () => {
      store.setIsRunning(currentAccountId, false)
      toast.error('自动发言已停止')
    }

    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.tasks.autoMessage.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [store, currentAccountId, toast])

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
