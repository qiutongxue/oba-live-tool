import { useCallback, useEffect, useState } from 'react'
import { useToast } from './useToast'

export function useAutoMessage() {
  const [isAutoMessageRunning, setAutoMessageRunning] = useState(false)
  const { toast } = useToast()
  const handleTaskStop = useCallback(() => {
    setAutoMessageRunning(false)
    toast.error('自动消息已停止')
  }, [])
  useEffect(() => {
    window.ipcRenderer.on(window.ipcChannels.tasks.autoMessage.stop, handleTaskStop)
    return () => {
      window.ipcRenderer.off(window.ipcChannels.tasks.autoMessage.stop, handleTaskStop)
    }
  }, [handleTaskStop])
  return { isAutoMessageRunning, setAutoMessageRunning }
}
