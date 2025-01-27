import type { LiveControlContextType } from '@/contexts/LiveControlContext'
import { LiveControlContext } from '@/contexts/LiveControlContext'
import { useContext } from 'react'

export function useLiveControl(): LiveControlContextType {
  const context = useContext(LiveControlContext)
  if (!context)
    throw new Error('useLiveControl must be used within a LiveControlProvider')
  return context
}
