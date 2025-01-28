import type { TaskConfig } from './useTaskConfig'
import { useState } from 'react'
import { useToast } from './useToast'

interface TaskOperationProps {
  config: TaskConfig
  configValidator: (setValidationError: (error: string | null) => void) => boolean
  onStartTask?: () => void
  onStopTask?: () => void
}

export function useTaskOperation({
  onStartTask,
  onStopTask,
}: TaskOperationProps) {
  const { toast } = useToast()
  const [validationError, setValidationError] = useState<string | null>(null)

  //   const isTaskRunning = taskType === 'autoMessage' ? isAutoMessageRunning : isAutoPopUpRunning
  //   const setTaskRunning = taskType === 'autoMessage' ? setAutoMessageRunning : setAutoPopUpRunning

  const startTask = async () => {
    try {
      onStartTask?.()
      toast.success('任务启动成功')
    }
    catch {
      toast.error('任务启动失败')
    }
  }

  const stopTask = async () => {
    try {
      onStopTask?.()
      toast.success('任务已停止')
    }
    catch {
      toast.error('停止任务失败')
    }
  }

  return {
    validationError,
    setValidationError,
    startTask,
    stopTask,
  }
}
