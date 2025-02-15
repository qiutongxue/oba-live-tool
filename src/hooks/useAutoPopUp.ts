import { eventEmitter, EVENTS } from '@/utils/events'
import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
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
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          if (key === 'state') {
            const oldState = value as { config: AutoPopUpConfig }
            // 检查是否是旧版本的数据结构（通过检查是否存在 config 字段）
            if (oldState && oldState.config && !('contexts' in oldState)) {
              // 迁移到新的数据结构
              return {
                contexts: {
                  default: oldState.config, // 将旧配置迁移到默认账号
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
          Object.entries(state.contexts).map(([key, value]) => [
            key,
            Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'isRunning')),
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
    const handleTaskStop = () => {
      store.setIsRunning(currentAccountId, false)
      toast.error('自动弹窗已停止')
    }

    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.tasks.autoPopUp.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [store, currentAccountId, toast])

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
