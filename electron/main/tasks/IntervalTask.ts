import { Result } from '@praha/byethrow'
import { UnexpectedError } from '#/errors/AppError'
import { randomInt } from '#/utils'
import { type BaseTaskProps, createTask } from './BaseTask'
import { TaskStopReason } from './ITask'

export interface IntervalTaskProps extends BaseTaskProps {
  /** 定时执行的间隔，可以是区间也可以是定值 */
  interval: [number, number] | number
}

export function createIntervalTask(
  execute: (signal: AbortSignal) => Promise<Result.Result<void, Error>>,
  props: IntervalTaskProps,
) {
  const { logger } = props
  let timer: ReturnType<typeof setTimeout> | null = null
  let interval = props.interval
  let abortController: AbortController | null = null

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const calculateNextInterval = () => {
    if (typeof interval === 'number') {
      return interval
    }
    const [mn, mx] = [Math.min(...interval), Math.max(...interval)]
    return randomInt(mn, mx)
  }

  const task = createTask(props, {
    onStart: () => {
      scheduleNextRun()
    },
    onStop: () => {
      clearTimer()
      if (abortController) {
        abortController.abort()
        abortController = null
      }
    },
  })

  async function scheduleNextRun() {
    if (!task.isRunning()) {
      return
    }
    clearTimer()

    // 中止上一个任务
    if (abortController) {
      abortController.abort()
    }

    abortController = new AbortController()
    const { signal } = abortController

    try {
      const executeResult = await execute(signal)
      if (Result.isFailure(executeResult)) {
        return task.stop(TaskStopReason.ERROR, executeResult.error)
      }

      if (task.isRunning() && !signal.aborted) {
        const interval = calculateNextInterval()
        timer = setTimeout(() => scheduleNextRun(), interval)
        logger.info(`任务将在 ${interval / 1000} 秒后继续执行。`)
      }
    } catch (error) {
      // 兜底用的，不能保证 execute 里涉及的第三方库代码不会抛出错误
      task.stop(TaskStopReason.ERROR, new UnexpectedError({ cause: error }))
    }
  }

  return {
    ...task,
    validateInterval(interval: IntervalTaskProps['interval']) {
      if (
        (typeof interval === 'number' && interval <= 0) ||
        (Array.isArray(interval) && interval.some(t => t <= 0))
      ) {
        throw new Error('配置验证失败：不能将计时器设置为 0 或负数')
      }
    },
    updateInterval(newInterval: IntervalTaskProps['interval']) {
      interval = newInterval
    },
    restart() {
      if (!task.isRunning()) return
      scheduleNextRun()
    },
  }
}
