import { createLogger } from '#/logger'
import { merge } from 'lodash-es'

export interface SchedulerConfig {
  readonly name: string
  interval: [number, number]
  maxRetries?: number
}

export interface BaseConfig {
  scheduler?: SchedulerConfig
}

export interface Scheduler {
  start: () => void
  stop: () => void
  updateConfig: (newConfig: BaseConfig) => void
  isRunning: boolean
}

export function createScheduler(
  executor: () => Promise<void>,
  config: SchedulerConfig,
): Scheduler {
  const logger = createLogger('Scheduler')
  let timerId: NodeJS.Timeout | null = null
  let isStopped = true

  function calculateNextInterval() {
    const [min, max] = config.interval
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function clearTimer() {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  function scheduleNext(delay: number) {
    clearTimer()
    logger.info(`下次执行「${config.name}」将在 ${delay / 1000} 秒后`)
    timerId = setTimeout(async () => {
      try {
        await executor()
      }
      catch (error) {
        logger.error(`执行「${config.name}」失败:`, error)
      }
      finally {
        if (!isStopped) {
          scheduleNext(calculateNextInterval())
        }
      }
    }, delay)
  }

  return {
    start() {
      if (isStopped) {
        isStopped = false
        scheduleNext(0)
      }
    },

    stop() {
      isStopped = true
      clearTimer()
    },
    updateConfig(newConfig: BaseConfig) {
      config = merge({}, config, newConfig)
    },
    get isRunning() {
      return !isStopped
    },
  }
}
