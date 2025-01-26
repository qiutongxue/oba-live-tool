import React, { createContext, useContext, useState } from 'react'

interface LiveControlContextType {
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
}

const LiveControlContext = createContext<LiveControlContextType | null>(null)

export function LiveControlProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <LiveControlContext.Provider value={{ isConnected, setIsConnected }}>
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
