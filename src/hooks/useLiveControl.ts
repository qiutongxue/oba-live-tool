import { create } from 'zustand'

interface LiveControlStore {
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
}

export const useLiveControl = create<LiveControlStore>((set) => {
  return {
    isConnected: false,
    setIsConnected: connected => set({ isConnected: connected }),
  }
})
