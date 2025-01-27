import type { TaskConfig } from '@/types'
import { useEffect, useState } from 'react'
import { useLiveControl } from './useLiveControl'

interface TaskOperationProps {
  taskType: 'auto-message' | 'auto-popup'
  config: TaskConfig
  originalConfig: TaskConfig
  setOriginalConfig: (config: TaskConfig) => void
  configValidator: (setValidationError: (error: string | null) => void) => boolean
}

export function useTaskOperation({
  taskType,
  config,
  originalConfig,
  setOriginalConfig,
  configValidator,
}: TaskOperationProps) {
  const {
    isConnected,
    isAutoMessageRunning,
    isAutoPopUpRunning,
    setAutoMessageRunning,
    setAutoPopUpRunning,
  } = useLiveControl()

  const [isStarting, setIsStarting] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const isTaskRunning = taskType === 'auto-message' ? isAutoMessageRunning : isAutoPopUpRunning
  const setTaskRunning = taskType === 'auto-message' ? setAutoMessageRunning : setAutoPopUpRunning

  const hasChanges = (): boolean => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig)
  }

  useEffect(() => {
    const handleStop = () => {
      setTaskRunning(false)
      setToast({ message: `任务已停止`, type: 'success' })
    }

    window.ipcRenderer.on(`stop-${taskType}`, handleStop)

    return () => {
      window.ipcRenderer.off(`stop-${taskType}`, handleStop)
    }
  }, [taskType, setTaskRunning])

  const startTask = async () => {
    try {
      setIsStarting(true)
      await window.ipcRenderer.invoke(`start-${taskType}`, {
        ...(taskType === 'auto-message'
          ? {
              messages: config.autoMessage.messages,
              scheduler: config.autoMessage.scheduler,
              pinTops: config.autoMessage.pinTops,
              random: config.autoMessage.random,
            }
          : {
              goodsIds: config.autoPopUp.goodsIds,
              scheduler: config.autoPopUp.scheduler,
              random: config.autoPopUp.random,
            }),
      })
      setTaskRunning(true)
      setToast({ message: '任务启动成功', type: 'success' })
    }
    catch {
      setToast({ message: '任务启动失败', type: 'error' })
    }
    finally {
      setIsStarting(false)
    }
  }

  const stopTask = async () => {
    try {
      await window.ipcRenderer.invoke(`stop-${taskType}`)
      setTaskRunning(false)
      setToast({ message: '任务已停止', type: 'success' })
    }
    catch {
      setToast({ message: '停止任务失败', type: 'error' })
    }
  }

  const saveConfig = async () => {
    if (!configValidator(setValidationError))
      return

    try {
      await window.ipcRenderer.invoke('save-task-config', config)
      setOriginalConfig(config)
      setToast({ message: '配置保存成功', type: 'success' })
    }
    catch {
      setToast({ message: '配置保存失败', type: 'error' })
    }
  }

  return {
    isConnected,
    isStarting,
    isTaskRunning,
    toast,
    validationError,
    setValidationError,
    setToast,
    hasChanges,
    startTask,
    stopTask,
    saveConfig,
  }
}
