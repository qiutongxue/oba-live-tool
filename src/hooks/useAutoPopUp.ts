import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { useToast } from './useToast'

interface AutoPopUpStore {
  isAutoPopUpRunning: boolean
  setAutoPopUpRunning: (running: boolean) => void
}

const useAutoPopUpStore = create<AutoPopUpStore>((set) => {
  return {
    isAutoPopUpRunning: false,
    setAutoPopUpRunning: running => set({ isAutoPopUpRunning: running }),
  }
})

export function useAutoPopUp() {
  const { isAutoPopUpRunning, setAutoPopUpRunning } = useAutoPopUpStore()
  const { toast } = useToast()
  const handleTaskStop = useCallback(() => {
    setAutoPopUpRunning(false)
    toast.error('自动弹窗已停止')
  }, [setAutoPopUpRunning, toast])

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(window.ipcChannels.tasks.autoPopUp.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [handleTaskStop])
  return { isAutoPopUpRunning, setAutoPopUpRunning }
}
