import { randomInt } from '#/utils'
import { BaseTask, type BaseTaskProps } from './BaseTask'
import { TaskStopReason } from './ITask'

export interface IntervalTaskProps extends BaseTaskProps {
  /** 定时执行的间隔，可以是区间也可以是定值 */
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
    this.clearTimer()
  }

  private async scheduleNextRun(): Promise<void> {
    if (!this.isRunning) {
      return
    }
    this.clearTimer()

    try {
      this.execute()
    } catch (error) {
      this.internalStop(TaskStopReason.ERROR, error)
    }

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

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
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

  protected abstract execute(): Promise<void> | void
}
