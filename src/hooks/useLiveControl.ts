import { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface LiveControlContext {
  isConnected: ConnectionStatus
  accountName: string | null
  platform: 'buyin' | 'douyin'
}

interface LiveControlStore {
  contexts: Record<string, LiveControlContext>
  setIsConnected: (accountId: string, connected: ConnectionStatus) => void
  setAccountName: (accountId: string, name: string | null) => void
  setPlatform: (accountId: string, platform: 'buyin' | 'douyin') => void
}

function defaultContext(): LiveControlContext {
  return {
    isConnected: 'disconnected',
    accountName: null,
    platform: 'douyin',
  }
}

export const useLiveControlStore = create<LiveControlStore>()(
  immer(set => {
    return {
      contexts: {
        default: defaultContext(),
      },
      setIsConnected: (accountId, connected) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          console.log('before', accountId, JSON.stringify(state.contexts))
          state.contexts[accountId].isConnected = connected
          console.log('after', accountId, JSON.stringify(state.contexts))
        }),
      setAccountName: (accountId, name) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].accountName = name
        }),
      setPlatform: (accountId, platform) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].platform = platform
        }),
    }
  }),
)

export function useLiveControl() {
  const { contexts, setIsConnected, setAccountName, setPlatform } =
    useLiveControlStore()

  const currentAccountId = useAccounts(state => state.currentAccountId)
  const context = useMemo(
    () => contexts[currentAccountId] || defaultContext(),
    [contexts, currentAccountId],
  )

  return {
    isConnected: context.isConnected,
    accountName: context.accountName,
    platform: context.platform,
    currentAccountId,
    setIsConnected: useCallback(
      (connected: ConnectionStatus) => {
        setIsConnected(currentAccountId, connected)
      },
      [currentAccountId, setIsConnected],
    ),
    setAccountName: useCallback(
      (name: string | null) => {
        setAccountName(currentAccountId, name)
      },
      [currentAccountId, setAccountName],
    ),
    setPlatform: useCallback(
      (platform: 'buyin' | 'douyin') => {
        setPlatform(currentAccountId, platform)
      },
      [currentAccountId, setPlatform],
    ),
  }
}
