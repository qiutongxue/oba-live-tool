import { LiveControlContext } from '@/contexts/LiveControlContext'
import React, { useMemo, useState } from 'react'

export function LiveControlProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isAutoMessageRunning, setAutoMessageRunning] = useState(false)
  const [isAutoPopUpRunning, setAutoPopUpRunning] = useState(false)

  const value = useMemo(() => ({
    isConnected,
    setIsConnected,
    isAutoMessageRunning,
    setAutoMessageRunning,
    isAutoPopUpRunning,
    setAutoPopUpRunning,
  }), [isConnected, isAutoMessageRunning, isAutoPopUpRunning])

  return (
    <LiveControlContext.Provider value={value}>
      {children}
    </LiveControlContext.Provider>
  )
}
