import { useCallback } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

/**
 * 支持的任务类型
 */
type Task = AutoCommentTask | AutoPopupTask

/**
 * 任务类型字符串
 */
export type TaskType = Task['type']

/**
 * 任务控制 Hook 参数
 */
interface UseTaskControlParams<T extends TaskType> {
  /** 任务类型 */
  taskType: T
  /** 获取任务运行状态的函数 */
  getIsRunning: () => boolean
  /** 获取任务配置的函数 */
  getConfig: () => Extract<Task, { type: T }>['config']
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
export function useTaskControl<T extends TaskType>(params: UseTaskControlParams<T>) {
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
    const config = getConfig()

    let result: boolean
    if (taskType === 'auto-comment') {
      result = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoMessage.start,
        accountId,
        config as AutoCommentConfig,
      )
    } else {
      result = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoPopUp.start,
        accountId,
        config as AutoPopupConfig,
      )
    }

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
    if (taskType === 'auto-comment') {
      await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoMessage.stop, accountId)
    } else {
      await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.stop, accountId)
    }
    setIsRunning(false)
  }, [setIsRunning, accountId, taskType])

  return {
    isRunning: getIsRunning(),
    onStartTask,
    onStopTask,
  }
}
