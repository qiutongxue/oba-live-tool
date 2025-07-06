import { useMemoizedFn, useThrottleFn } from 'ahooks'
import { useEffect, useMemo, useRef } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useShallow } from 'zustand/react/shallow'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'
import { useOSPlatform } from './useOSPlatform'

// 快捷键映射类型定义
export interface ShortcutMapping {
  id: string
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
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
  shortcuts?: ShortcutMapping[]
  isGlobalShortcut?: boolean
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
  setGlobalShortcut: (accountId: string, globalShortcut: boolean) => void
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
        setGlobalShortcut: (accountId, value) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.isGlobalShortcut = value
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
  const setGlobalShortcut = useAutoPopUpStore(state => state.setGlobalShortcut)
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
      setGlobalShortcut: (value: boolean) => {
        setGlobalShortcut(currentAccountId, value)
      },
    }),
    [
      currentAccountId,
      setIsRunning,
      updateConfig,
      setShortcuts,
      setGlobalShortcut,
    ],
  )
}

// 添加快捷键监听 hook
export const useShortcutListener = () => {
  const shortcuts = useCurrentAutoPopUp(context => context.shortcuts)
  const isRunning = useCurrentAutoPopUp(context => context.isRunning)
  const isGlobalShortcut = useCurrentAutoPopUp(ctx => ctx.isGlobalShortcut)
  const platform = useOSPlatform()

  // 全局的
  useEffect(() => {
    if (!isGlobalShortcut) return
    if (!isRunning) return
    if (!shortcuts || shortcuts.length === 0) return

    const mappedShortcuts = shortcuts.map(sc => {
      const accelerator = [
        sc.ctrl && 'CommandOrControl',
        sc.alt && 'Alt',
        sc.shift && 'Shift',
        sc.key,
      ]
        .filter(Boolean)
        .join('+')

      return {
        accelerator,
        goodsIds: sc.goodsIds,
      }
    })

    window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoPopUp.registerShortcuts,
      mappedShortcuts,
    )

    return () => {
      window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoPopUp.unregisterShortcuts,
      )
    }
  }, [isGlobalShortcut, shortcuts, isRunning])

  const throttledKeydown = useThrottleFn(
    (e: KeyboardEvent, shortcuts: ShortcutMapping[]) => {
      // 检查是否有匹配的快捷键
      const shortcut = shortcuts.find(
        s => s.key.toLocaleLowerCase() === e.key.toLocaleLowerCase(),
      )
      if (
        shortcut &&
        !!shortcut.ctrl ===
          // Mac 系统可以用 Command 代替 Ctrl，也可以使用 Control
          ((platform === 'MacOS' && e.metaKey) || e.ctrlKey) &&
        !!shortcut.alt === e.altKey &&
        !!shortcut.shift === e.shiftKey
      ) {
        window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.updateConfig, {
          goodsIds: shortcut.goodsIds,
        })
      }
    },
    { wait: 1000, trailing: false },
  )

  // 局部的
  useEffect(() => {
    if (isGlobalShortcut) return
    if (!isRunning) return
    if (!shortcuts || shortcuts.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否有匹配的快捷键
      throttledKeydown.run(e, shortcuts)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, isRunning, isGlobalShortcut, throttledKeydown])
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
