import { eventEmitter, EVENTS } from '@/utils/events'
import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

interface AutoPopUpConfig {
  scheduler: {
    interval: [number, number]
  }
  goodsIds: number[]
  random: boolean
}

interface AutoPopUpContext {
  isRunning: boolean
  config: AutoPopUpConfig
}

const defaultContext: AutoPopUpContext = {
  isRunning: false,
  config: {
    scheduler: {
      interval: [30000, 45000],
    },
    goodsIds: [],
    random: false,
  },
}

interface AutoPopUpStore {
  contexts: Record<string, AutoPopUpContext>
  setIsRunning: (accountId: string, running: boolean) => void
  setConfig: (accountId: string, config: Partial<AutoPopUpConfig>) => void
}

export const useAutoPopUpStore = create<AutoPopUpStore>()(
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
      name: 'auto-popup-storage',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          try {
            const persisted = persistedState as { config: AutoPopUpConfig }
            if (!persisted.config) {
              throw new Error('config is required')
            }
            return {
              contexts: {
                default: {
                  config: persisted.config,
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
          Object.entries(state.contexts).map(([accountId, context]) => [
            // [accountId, context { isRunning, config }]
            accountId,
            Object.fromEntries(Object.entries(context).filter(([key]) => key !== 'isRunning')),
          ]),
        ),
      }),
    },
  ),
)

export function useAutoPopUp() {
  const store = useAutoPopUpStore()
  const { toast } = useToast()
  const { currentAccountId } = useAccounts()

  const context = store.contexts[currentAccountId] || defaultContext
  const updateConfig = (newConfig: Partial<AutoPopUpConfig>) => {
    store.setConfig(currentAccountId, newConfig)
  }

  useEffect(() => {
    const handleTaskStop = (accountId: string) => {
      store.setIsRunning(accountId, false)
      toast.error('自动弹窗已停止')
    }

    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.tasks.autoPopUp.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [store, toast])

  return {
    isRunning: context.isRunning,
    config: context.config,
    setIsRunning: (running: boolean) => store.setIsRunning(currentAccountId, running),
    setScheduler: (scheduler: AutoPopUpConfig['scheduler']) =>
      updateConfig({ scheduler }),
    setGoodsIds: (goodsIds: AutoPopUpConfig['goodsIds']) =>
      updateConfig({ goodsIds }),
    setRandom: (random: boolean) =>
      updateConfig({ random }),
  }
}
