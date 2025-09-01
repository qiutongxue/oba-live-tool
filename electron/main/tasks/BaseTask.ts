import { uniqueId } from 'lodash-es'
import type { ScopedLogger } from '#/logger'
import { type ITask, type TaskStopCallback, TaskStopReason } from './ITask'

export interface BaseTaskProps {
  taskName: string
  readonly logger: ScopedLogger
}

export abstract class BaseTask<Cfg> implements ITask<Cfg> {
  protected readonly taskId: string
  protected isRunning = false
  protected readonly logger: ScopedLogger
  private taskName: string
  private _onStop: TaskStopCallback = () => {}

  constructor({ taskName, logger }: BaseTaskProps) {
    this.taskName = taskName
    this.taskId = uniqueId(taskName)
    this.logger = logger.scope(taskName)
  }

  public getTaskId(): string {
    return this.taskId
  }

  public onStop(cb: TaskStopCallback) {
    this._onStop = cb
  }

  public abstract start(): void | Promise<void>

  public stop(): void {
    if (this.isRunning) {
      this.internalStop(TaskStopReason.MANUAL)
    }
  }

  public getTaskName() {
    return this.taskName
  }

  protected internalStop(reason: TaskStopReason, err?: unknown) {
    if (!this.isRunning) return
    this.isRunning = false
    if (err) {
      this.logger.error(`任务因错误中断：${err}`)
    } else {
      this.logger.info('任务已停止')
    }
    this._onStop(this.taskId, reason, err)
  }
}
