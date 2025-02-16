import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'

interface LiveControlContext {
  isConnected: boolean
  accountName: string | null
}

interface LiveControlStore {
  contexts: Record<string, LiveControlContext>
  setIsConnected: (accountId: string, connected: boolean) => void
  setAccountName: (accountId: string, name: string | null) => void
}

const defaultContext: LiveControlContext = {
  isConnected: false,
  accountName: null,
}

export const useLiveControlStore = create<LiveControlStore>()(immer((set) => {
  return {
    contexts: {
      default: defaultContext,
    },
    setIsConnected: (accountId, connected) => set((state) => {
      if (!state.contexts[accountId]) {
        state.contexts[accountId] = defaultContext
      }
      state.contexts[accountId].isConnected = connected
    }),
    setAccountName: (accountId, name) => set((state) => {
      if (!state.contexts[accountId]) {
        state.contexts[accountId] = defaultContext
      }
      state.contexts[accountId].accountName = name
    }),
  }
}))

export function useLiveControl() {
  const { contexts, setIsConnected, setAccountName } = useLiveControlStore()

  const currentAccountId = useAccounts(state => state.currentAccountId)
  const context = contexts[currentAccountId] || defaultContext

  return {
    isConnected: context.isConnected,
    accountName: context.accountName,
    setIsConnected: (connected: boolean) => setIsConnected(currentAccountId, connected),
    setAccountName: (name: string | null) => setAccountName(currentAccountId, name),
  }
}
