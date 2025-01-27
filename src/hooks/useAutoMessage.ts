import { useCallback, useEffect, useState } from 'react'

export function useAutoMessage() {
  const [isAutoMessageRunning, setAutoMessageRunning] = useState(false)
  const handleTaskStop = useCallback(() => {
    setAutoMessageRunning(false)
  }, [])
  useEffect(() => {
    window.ipcRenderer.on(window.ipcChannels.tasks.autoMessage.stop, handleTaskStop)
    return () => {
      window.ipcRenderer.off(window.ipcChannels.tasks.autoMessage.stop, handleTaskStop)
    }
  }, [handleTaskStop])
  return { isAutoMessageRunning, setAutoMessageRunning }
}
