import { createLogger } from '#/logger'

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
  private logger: ReturnType<typeof createLogger>
  constructor(
    name: string,
    executor: () => Promise<void>,
    config: SchedulerConfig,
    logger?: ReturnType<typeof createLogger>,
  ) {
    this.name = name
    this.executor = executor
    this.config = config
    this.logger = logger ?? createLogger('Scheduler')
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
    // 重试机制
    let retry = 0
    const maxRetries = this.config.maxRetries ?? 3
    while (this.isRunning && retry < maxRetries) {
      try {
        await this.executor()
        break
      } catch (error) {
        this.logger.error(
          `（已尝试 ${retry + 1} 次）执行「${this.name}」失败:`,
          error,
        )
        retry++
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (retry >= maxRetries) {
      this.logger.error(`执行「${this.name}」失败，已达到最大重试次数`)
      this.stop()
      return
    }

    if (!this.isStopped) {
      this.scheduleNext(this.calculateNextInterval())
    }
  }

  private scheduleNext(delay: number) {
    this.clearTimer()
    this.logger.info(`下次执行「${this.name}」将在 ${delay / 1000} 秒后`)
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
