import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface LiveControlContext {
  isConnected: ConnectionStatus
  accountName: string | null
  platform: LiveControlPlatform
}

interface LiveControlActions {
  setIsConnected: (accountId: string, connected: ConnectionStatus) => void
  setAccountName: (accountId: string, name: string | null) => void
  setPlatform: (accountId: string, platform: LiveControlPlatform) => void
}

type LiveControlStore = LiveControlActions & {
  contexts: Record<string, LiveControlContext>
}

function defaultContext(): LiveControlContext {
  return {
    isConnected: 'disconnected',
    accountName: null,
    platform: 'douyin',
  }
}

export const useLiveControlStore = create<LiveControlStore>()(
  persist(
    immer(set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          delete state.contexts[accountId]
        })
      })

      const ensureContext = (state: LiveControlStore, accountId: string) => {
        if (!state.contexts[accountId]) {
          state.contexts[accountId] = defaultContext()
        }
        return state.contexts[accountId]
      }

      return {
        contexts: {
          default: defaultContext(),
        },
        setIsConnected: (accountId, connected) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.isConnected = connected
          }),
        setAccountName: (accountId, name) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.accountName = name
          }),
        setPlatform: (accountId, platform) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.platform = platform
          }),
      }
    }),
    {
      name: 'live-control-storage',
      partialize: state => {
        const contexts: Record<
          string,
          Pick<LiveControlContext, 'platform'>
        > = {}
        for (const key in state.contexts) {
          contexts[key] = { platform: state.contexts[key].platform }
        }
        return { contexts }
      },
      merge: (_persistedState, currentState) => {
        const persistedState = _persistedState as {
          contexts: Record<string, Pick<LiveControlContext, 'platform'>>
        }
        const mergedContexts: Record<string, LiveControlContext> = {}
        for (const key in persistedState.contexts ?? {}) {
          mergedContexts[key] = {
            ...defaultContext(),
            ...persistedState.contexts[key],
          }
        }
        return {
          ...currentState,
          contexts: mergedContexts,
        }
      },
    },
  ),
)

export const useCurrentLiveControlActions = () => {
  const setIsConnected = useLiveControlStore(state => state.setIsConnected)
  const setAccountName = useLiveControlStore(state => state.setAccountName)
  const setPlatform = useLiveControlStore(state => state.setPlatform)
  const currentAccountId = useAccounts(state => state.currentAccountId)
  return useMemo(
    () => ({
      setIsConnected: (connected: ConnectionStatus) => {
        setIsConnected(currentAccountId, connected)
      },
      setAccountName: (name: string | null) => {
        setAccountName(currentAccountId, name)
      },
      setPlatform: (platform: LiveControlPlatform) => {
        setPlatform(currentAccountId, platform)
      },
    }),
    [currentAccountId, setIsConnected, setAccountName, setPlatform],
  )
}

export const useCurrentLiveControl = <T>(
  getter: (context: LiveControlContext) => T,
): T => {
  const currentAccountId = useAccounts(state => state.currentAccountId)
  return useLiveControlStore(state => {
    const context = state.contexts[currentAccountId] ?? defaultContext()
    return getter(context)
  })
}
