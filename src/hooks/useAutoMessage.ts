import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { useToast } from './useToast'

interface AutoMessageStore {
  isAutoMessageRunning: boolean
  setAutoMessageRunning: (running: boolean) => void
}

const useAutoMessageStore = create<AutoMessageStore>((set) => {
  return {
    isAutoMessageRunning: false,
    setAutoMessageRunning: running => set({ isAutoMessageRunning: running }),
  }
})

export function useAutoMessage() {
  const { isAutoMessageRunning, setAutoMessageRunning } = useAutoMessageStore()
  const { toast } = useToast()
  const handleTaskStop = useCallback(() => {
    setAutoMessageRunning(false)
    toast.error('自动消息已停止')
  }, [setAutoMessageRunning, toast])
  useEffect(() => {
    const removeListener = window.ipcRenderer.on(window.ipcChannels.tasks.autoMessage.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [handleTaskStop])
  return { isAutoMessageRunning, setAutoMessageRunning }
}
