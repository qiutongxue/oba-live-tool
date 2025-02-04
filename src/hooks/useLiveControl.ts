import { create } from 'zustand'

interface LiveControlStore {
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
}

export const useLiveControlStore = create<LiveControlStore>((set) => {
  return {
    isConnected: false,
    setIsConnected: connected => set({ isConnected: connected }),
  }
})

export function useLiveControl() {
  const { isConnected, setIsConnected } = useLiveControlStore()

  return { isConnected, setIsConnected }
}
