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

  public start(): void {
    if (this.isRunning) {
      return
    }
    this.isRunning = true

    // 立即启动第一次执行，然后由它自己调度下一次
    this.scheduleNextRun()
  }

  public stop(): void {
    super.stop()
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }

  private async scheduleNextRun(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    // 错误已经处理过了，不用捕获
    await this.runWithRetries()

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

  protected abstract execute(): Promise<void>
}
