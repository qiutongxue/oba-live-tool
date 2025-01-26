import React, { createContext, useContext, useState } from 'react'

interface LiveControlContextType {
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  isAutoMessageRunning: boolean
  setAutoMessageRunning: (running: boolean) => void
  isAutoPopUpRunning: boolean
  setAutoPopUpRunning: (running: boolean) => void
}

const LiveControlContext = createContext<LiveControlContextType | null>(null)

export function LiveControlProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isAutoMessageRunning, setAutoMessageRunning] = useState(false)
  const [isAutoPopUpRunning, setAutoPopUpRunning] = useState(false)

  return (
    <LiveControlContext.Provider value={{
      isConnected,
      setIsConnected,
      isAutoMessageRunning,
      setAutoMessageRunning,
      isAutoPopUpRunning,
      setAutoPopUpRunning,
    }}
    >
      {children}
    </LiveControlContext.Provider>
  )
}

export function useLiveControl() {
  const context = useContext(LiveControlContext)
  if (!context)
    throw new Error('useLiveControl must be used within a LiveControlProvider')
  return context
}
