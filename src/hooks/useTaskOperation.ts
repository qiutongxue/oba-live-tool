import type { TaskConfig } from '@/types'
import { useState } from 'react'

interface TaskOperationProps {
  config: TaskConfig
  originalConfig: TaskConfig
  setOriginalConfig: (config: TaskConfig) => void
  configValidator: (setValidationError: (error: string | null) => void) => boolean
  onStartTask?: () => void
  onStopTask?: () => void
}

export function useTaskOperation({
  config,
  originalConfig,
  setOriginalConfig,
  configValidator,
  onStartTask,
  onStopTask,
}: TaskOperationProps) {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  //   const isTaskRunning = taskType === 'autoMessage' ? isAutoMessageRunning : isAutoPopUpRunning
  //   const setTaskRunning = taskType === 'autoMessage' ? setAutoMessageRunning : setAutoPopUpRunning

  const hasChanges = (): boolean => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig)
  }

  const startTask = async () => {
    try {
      onStartTask?.()
      setToast({ message: '任务启动成功', type: 'success' })
    }
    catch {
      setToast({ message: '任务启动失败', type: 'error' })
    }
  }

  const stopTask = async () => {
    try {
      onStopTask?.()
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
      await window.ipcRenderer.invoke(window.ipcChannels.config.save, config)
      setOriginalConfig(config)
      setToast({ message: '配置保存成功', type: 'success' })
    }
    catch {
      setToast({ message: '配置保存失败', type: 'error' })
    }
  }

  return {
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
