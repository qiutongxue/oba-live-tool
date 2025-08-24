import { randomInt } from '#/utils'
import { BaseTask, type BaseTaskProps } from './BaseTask'

// 定义所有间隔任务都必须包含的配置
export interface IntervalTaskProps extends BaseTaskProps {
  interval: [number, number] | number
}

export abstract class IntervalTask<Cfg> extends BaseTask<Cfg> {
  private timer: NodeJS.Timeout | null = null
  private interval: IntervalTaskProps['interval']
  constructor({ interval, ...params }: IntervalTaskProps) {
    super(params)
    this.interval = interval
  }

  // start() 方法现在是具体实现，不再是 abstract
  public start(): void {
    if (this.isRunning) {
      this.logger.warn('Task is already running.')
      return
    }
    this.logger.info('Interval task starting...')
    this.isRunning = true

    // 立即启动第一次执行，然后由它自己调度下一次
    this.scheduleNextRun()
  }

  // stop() 方法也在这里实现
  public stop(): void {
    super.stop() // 调用 BaseTask 的 stop，将 isRunning 置为 false
    if (this.timer) {
      clearTimeout(this.timer)
      this.logger.info('Task scheduling has been stopped.')
    }
  }

  // 调度逻辑被封装在基类中
  private async scheduleNextRun(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    await this.runWithRetries()

    // 只要任务没被停止，就调度下一次
    if (this.isRunning) {
      const interval = this.calculateNextInterval()
      this.logger.info(`任务将在 ${interval / 1000} 秒后继续执行。`)
      this.timer = setTimeout(() => this.scheduleNextRun(), interval)
    }
  }

  private calculateNextInterval() {
    const interval = this.interval
    if (typeof interval === 'number') {
      return interval
    }
    const [mn, mx] = [Math.min(...interval), Math.max(...interval)]
    return randomInt(mn, mx)
  }

  public updateInterval(interval: IntervalTaskProps['interval']) {
    this.interval = interval
  }

  protected restart() {
    if (!this.isRunning) return
    this.scheduleNextRun()
  }

  protected validateInterval(interval: IntervalTaskProps['interval']) {
    if (
      (typeof interval === 'number' && interval <= 0) ||
      (Array.isArray(interval) && interval.some(t => t <= 0))
    ) {
      throw new Error('配置验证失败：不能将计时器设置为 0 或负数')
    }
  }

  // 注意：execute() 方法仍然是 abstract。
  // IntervalTask 不知道具体要执行什么，它只负责调度。
  // 继承它的子类必须提供 execute() 的实现。
  protected abstract execute(): Promise<void>
}
