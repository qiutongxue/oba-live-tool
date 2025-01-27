import { useCallback, useEffect, useState } from 'react'
import { useToast } from './useToast'

export function useAutoPopUp() {
  const [isAutoPopUpRunning, setAutoPopUpRunning] = useState(false)
  const { toast } = useToast()
  const handleTaskStop = useCallback(() => {
    setAutoPopUpRunning(false)
    toast.error('自动弹窗已停止')
  }, [])
  useEffect(() => {
    window.ipcRenderer.on(window.ipcChannels.tasks.autoPopUp.stop, handleTaskStop)
    return () => {
      window.ipcRenderer.off(window.ipcChannels.tasks.autoPopUp.stop, handleTaskStop)
    }
  }, [handleTaskStop])
  return { isAutoPopUpRunning, setAutoPopUpRunning }
}
