import { createLogger } from '#/logger'

const logger = createLogger('Scheduler')

export interface SchedulerConfig {
  interval: [number, number]
  maxRetries?: number
  onStart?: () => void
  onStop?: () => void
}

export interface BaseConfig {
  scheduler: SchedulerConfig
}

export interface Scheduler {
  start: () => void
  stop: () => void
  updateConfig: (newConfig: BaseConfig) => void
  isRunning: boolean
}

export class TaskScheduler implements Scheduler {
  private timerId: NodeJS.Timeout | null = null
  private isStopped = true
  private readonly executor: () => Promise<void>
  private config: SchedulerConfig
  private readonly name: string

  constructor(name: string, executor: () => Promise<void>, config: SchedulerConfig) {
    this.name = name
    this.executor = executor
    this.config = config
  }

  private calculateNextInterval(): number {
    const [min, max] = this.config.interval
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private clearTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  private async executeTask() {
    try {
      await this.executor()
    }
    catch (error) {
      logger.error(`执行「${this.name}」失败:`, error)
      this.stop()
      return
    }

    if (!this.isStopped) {
      this.scheduleNext(this.calculateNextInterval())
    }
  }

  private scheduleNext(delay: number) {
    this.clearTimer()
    logger.info(`下次执行「${this.name}」将在 ${delay / 1000} 秒后`)
    this.timerId = setTimeout(() => this.executeTask(), delay)
  }

  public start() {
    if (this.isStopped) {
      this.isStopped = false
      this.config.onStart?.()
      this.scheduleNext(0)
    }
  }

  public stop() {
    this.isStopped = true
    this.clearTimer()
    this.config.onStop?.()
  }

  public updateConfig(newConfig: BaseConfig) {
    if (newConfig.scheduler) {
      this.config = {
        ...this.config,
        ...newConfig.scheduler,
      }
    }
  }

  public get isRunning() {
    return !this.isStopped
  }
}
