import { uniqueId } from 'lodash-es'
import type { ScopedLogger } from '#/logger'
import { type ITask, type TaskStopCallback, TaskStopReason } from './ITask'

export interface BaseTaskProps {
  taskName: string
  readonly logger: ScopedLogger
}

export function createTask(
  props: BaseTaskProps,
  hooks: { onStart?: () => void; onStop?: () => void },
): ITask {
  const { taskName, logger } = props
  const taskId = uniqueId(taskName)
  const stopListeners: TaskStopCallback[] = []
  let isRunning = false

  return {
    start: () => {
      if (!isRunning) {
        isRunning = true
        hooks.onStart?.()
      }
    },
    stop: (reason: TaskStopReason = TaskStopReason.MANUAL, err?: unknown) => {
      if (!isRunning) return
      isRunning = false
      if (err) {
        logger.error('任务因错误中断：', err)
      } else {
        logger.info('任务已停止')
      }
      hooks.onStop?.()
      stopListeners.forEach(cb => {
        cb(taskId, reason, err)
      })
    },
    getTaskId: () => taskId,
    addStopListener: (cb: TaskStopCallback) => {
      stopListeners.push(cb)
    },
    isRunning: () => isRunning,
  }
}
