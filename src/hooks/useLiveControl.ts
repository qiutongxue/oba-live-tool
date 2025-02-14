import { create } from 'zustand'

interface LiveControlStore {
  isConnected: boolean
  accountName: string | null
  setIsConnected: (connected: boolean) => void
  setAccountName: (name: string | null) => void
}

export const useLiveControlStore = create<LiveControlStore>((set) => {
  return {
    isConnected: false,
    accountName: null,
    setIsConnected: connected => set({ isConnected: connected }),
    setAccountName: name => set({ accountName: name }),
  }
})

export function useLiveControl() {
  const { isConnected, setIsConnected, accountName, setAccountName } = useLiveControlStore()

  return { isConnected, setIsConnected, accountName, setAccountName }
}
