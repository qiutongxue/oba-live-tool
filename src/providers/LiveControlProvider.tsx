import { LiveControlContext } from '@/contexts/LiveControlContext'
import { useAutoMessage } from '@/hooks/useAutoMessage'
import { useAutoPopUp } from '@/hooks/useAutoPopUp'
import React, { useMemo, useState } from 'react'

export function LiveControlProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const { isAutoMessageRunning, setAutoMessageRunning } = useAutoMessage()
  const { isAutoPopUpRunning, setAutoPopUpRunning } = useAutoPopUp()

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
