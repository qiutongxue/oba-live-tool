import { useCallback, useEffect, useState } from 'react'

export function useAutoPopUp() {
  const [isAutoPopUpRunning, setAutoPopUpRunning] = useState(false)
  const handleTaskStop = useCallback(() => {
    setAutoPopUpRunning(false)
  }, [])
  useEffect(() => {
    window.ipcRenderer.on(window.ipcChannels.tasks.autoPopUp.stop, handleTaskStop)
    return () => {
      window.ipcRenderer.off(window.ipcChannels.tasks.autoPopUp.stop, handleTaskStop)
    }
  }, [handleTaskStop])
  return { isAutoPopUpRunning, setAutoPopUpRunning }
}
