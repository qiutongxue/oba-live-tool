import { useCallback } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

/**
 * 任务类型
 */
export type TaskType = 'autoMessage' | 'autoPopUp'

/**
 * 任务控制 Hook 参数
 */
interface UseTaskControlParams<T> {
  /** 任务类型 */
  taskType: TaskType
  /** 获取任务运行状态的函数 */
  getIsRunning: () => boolean
  /** 获取任务配置的函数 */
  getConfig: () => T
  /** 设置任务运行状态的函数 */
  setIsRunning: (running: boolean) => void
  /** 任务启动成功提示消息 */
  startSuccessMessage?: string
  /** 任务启动失败提示消息 */
  startFailureMessage?: string
}

/**
 * 通用的任务控制 Hook
 * 用于统一管理任务的启动和停止逻辑
 *
 * @param params - 任务控制参数
 * @returns 任务控制相关的状态和方法
 */
export function useTaskControl<T extends Record<string, unknown>>(params: UseTaskControlParams<T>) {
  const {
    taskType,
    getIsRunning,
    getConfig,
    setIsRunning,
    startSuccessMessage,
    startFailureMessage,
  } = params

  const { toast } = useToast()
  const accountId = useAccounts(store => store.currentAccountId)

  /**
   * 启动任务
   */
  const onStartTask = useCallback(async () => {
    const channels =
      taskType === 'autoMessage'
        ? {
            start: IPC_CHANNELS.tasks.autoMessage.start,
            stop: IPC_CHANNELS.tasks.autoMessage.stop,
          }
        : {
            start: IPC_CHANNELS.tasks.autoPopUp.start,
            stop: IPC_CHANNELS.tasks.autoPopUp.stop,
          }
    const config = getConfig()

    const result = await window.ipcRenderer.invoke(channels.start, accountId, config)
    if (result) {
      setIsRunning(true)
      toast.success(startSuccessMessage || `${taskType} 任务已启动`)
    } else {
      setIsRunning(false)
      toast.error(startFailureMessage || `${taskType} 任务启动失败`)
    }
  }, [
    getConfig,
    setIsRunning,
    toast,
    accountId,
    startSuccessMessage,
    startFailureMessage,
    taskType,
  ])

  /**
   * 停止任务
   */
  const onStopTask = useCallback(async () => {
    const channels =
      taskType === 'autoMessage'
        ? {
            start: IPC_CHANNELS.tasks.autoMessage.start,
            stop: IPC_CHANNELS.tasks.autoMessage.stop,
          }
        : {
            start: IPC_CHANNELS.tasks.autoPopUp.start,
            stop: IPC_CHANNELS.tasks.autoPopUp.stop,
          }
    await window.ipcRenderer.invoke(channels.stop, accountId)
    setIsRunning(false)
  }, [setIsRunning, accountId, taskType])

  return {
    isRunning: getIsRunning(),
    onStartTask,
    onStopTask,
  }
}
