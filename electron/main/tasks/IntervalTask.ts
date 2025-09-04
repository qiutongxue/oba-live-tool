import { randomInt } from '#/utils'
import { type BaseTaskProps, createTask } from './BaseTask'
import { TaskStopReason } from './ITask'

export interface IntervalTaskProps extends BaseTaskProps {
  /** 定时执行的间隔，可以是区间也可以是定值 */
  interval: [number, number] | number
}

export function createIntervalTask(
  execute: () => Promise<void>,
  props: IntervalTaskProps,
) {
  const { logger } = props
  let timer: ReturnType<typeof setTimeout> | null = null
  let interval = props.interval

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
    },
  })

  async function scheduleNextRun() {
    if (task.isRunning()) {
      return
    }
    clearTimer()

    try {
      await execute()
    } catch (error) {
      task.stop(TaskStopReason.ERROR, error)
    }

    if (task.isRunning()) {
      const interval = calculateNextInterval()
      logger.info(`任务将在 ${interval / 1000} 秒后继续执行。`)
      timer = setTimeout(() => scheduleNextRun(), interval)
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
