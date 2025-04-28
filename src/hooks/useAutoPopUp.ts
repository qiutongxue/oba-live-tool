import { EVENTS, eventEmitter } from '@/utils/events'
import { useMemoizedFn } from 'ahooks'
import { useEffect, useMemo, useRef } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useShallow } from 'zustand/react/shallow'
import { useAccounts } from './useAccounts'

// 快捷键映射类型定义
export interface ShortcutMapping {
  id: string
  key: string
  goodsIds: number[]
}

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
  shortcuts: ShortcutMapping[]
}

const defaultContext = (): AutoPopUpContext => ({
  isRunning: false,
  config: {
    scheduler: {
      interval: [30000, 45000],
    },
    goodsIds: [],
    random: false,
  },
  shortcuts: [],
})

interface AutoPopUpStore {
  contexts: Record<string, AutoPopUpContext>
  setIsRunning: (accountId: string, running: boolean) => void
  setConfig: (accountId: string, config: Partial<AutoPopUpConfig>) => void
  setShortcuts: (accountId: string, shortcuts: ShortcutMapping[]) => void
}

export const useAutoPopUpStore = create<AutoPopUpStore>()(
  persist(
    immer(set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          delete state.contexts[accountId]
        })
      })

      const ensureContext = (state: AutoPopUpStore, accountId: string) => {
        if (!state.contexts[accountId]) {
          state.contexts[accountId] = defaultContext()
        }
        return state.contexts[accountId]
      }

      return {
        contexts: { default: defaultContext() },
        setIsRunning: (accountId, running) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.isRunning = running
          }),
        setConfig: (accountId, config) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.config = {
              ...state.contexts[accountId].config,
              ...config,
            }
          }),
        setShortcuts: (accountId, shortcuts) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.shortcuts = shortcuts
          }),
      }
    }),
    {
      name: 'auto-popup-storage',
      version: 2,
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
          } catch {
            return {
              contexts: {
                default: defaultContext(),
              },
            }
          }
        }
        if (version === 1) {
          try {
            const persisted = persistedState as AutoPopUpStore
            const contexts = Object.fromEntries(
              Object.entries(persisted.contexts).map(([key, value]) => [
                key,
                { ...value, shortcuts: [] },
              ]),
            )
            return {
              contexts,
            }
          } catch {
            return {
              contexts: {
                default: defaultContext(),
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
            Object.fromEntries(
              Object.entries(context).filter(([key]) => key !== 'isRunning'),
            ),
          ]),
        ),
      }),
    },
  ),
)

export const useAutoPopUpActions = () => {
  const setIsRunning = useAutoPopUpStore(state => state.setIsRunning)
  const setConfig = useAutoPopUpStore(state => state.setConfig)
  const setShortcuts = useAutoPopUpStore(state => state.setShortcuts)
  const currentAccountId = useAccounts(state => state.currentAccountId)
  const updateConfig = useMemoizedFn((newConfig: Partial<AutoPopUpConfig>) => {
    setConfig(currentAccountId, newConfig)
  })
  return useMemo(
    () => ({
      setIsRunning: (running: boolean) =>
        setIsRunning(currentAccountId, running),
      setScheduler: (scheduler: AutoPopUpConfig['scheduler']) =>
        updateConfig({ scheduler }),
      setGoodsIds: (goodsIds: AutoPopUpConfig['goodsIds']) =>
        updateConfig({ goodsIds }),
      setRandom: (random: boolean) => updateConfig({ random }),
      // 添加设置快捷键映射的方法
      setShortcuts: (shortcuts: ShortcutMapping[]) =>
        setShortcuts(currentAccountId, shortcuts),
      // 添加单个快捷键映射
      addShortcut: (shortcut: ShortcutMapping) => {
        const currentShortcuts =
          useAutoPopUpStore.getState().contexts[currentAccountId]?.shortcuts ??
          []
        setShortcuts(currentAccountId, [shortcut, ...currentShortcuts])
      },
      updateShortcut: (shortcut: ShortcutMapping) => {
        const currentShortcuts =
          useAutoPopUpStore.getState().contexts[currentAccountId]?.shortcuts ??
          []
        setShortcuts(
          currentAccountId,
          currentShortcuts.map(s => (s.id === shortcut.id ? shortcut : s)),
        )
      },
      // 删除快捷键映射
      removeShortcut: (id: string) => {
        const currentShortcuts =
          useAutoPopUpStore.getState().contexts[currentAccountId]?.shortcuts ||
          []
        setShortcuts(
          currentAccountId,
          currentShortcuts.filter(s => s.id !== id),
        )
      },
    }),
    [currentAccountId, setIsRunning, updateConfig, setShortcuts],
  )
}

// 添加快捷键监听 hook
export const useShortcutListener = () => {
  const shortcuts = useCurrentAutoPopUp(context => context.shortcuts)
  const isRunning = useCurrentAutoPopUp(context => context.isRunning)
  useEffect(() => {
    if (!isRunning) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否有匹配的快捷键
      const shortcut = shortcuts.find(
        s => s.key.toLocaleLowerCase() === e.key.toLocaleLowerCase(),
      )
      if (shortcut) {
        window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.updateConfig, {
          goodsIds: shortcut.goodsIds,
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, isRunning])
}

export const useCurrentAutoPopUp = <T>(
  getter: (context: AutoPopUpContext) => T,
): T => {
  const currentAccountId = useAccounts(state => state.currentAccountId)
  const defaultContextRef = useRef(defaultContext())
  return useAutoPopUpStore(
    useShallow(state => {
      const context =
        state.contexts[currentAccountId] ?? defaultContextRef.current
      return getter(context)
    }),
  )
}
