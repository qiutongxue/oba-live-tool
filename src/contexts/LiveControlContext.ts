import { createContext } from 'react'

export interface LiveControlContextType {
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  isAutoMessageRunning: boolean
  setAutoMessageRunning: (running: boolean) => void
  isAutoPopUpRunning: boolean
  setAutoPopUpRunning: (running: boolean) => void
}

export const LiveControlContext = createContext<LiveControlContextType | null>(null)
