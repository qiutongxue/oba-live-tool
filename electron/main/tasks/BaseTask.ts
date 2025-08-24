import { uniqueId } from 'lodash-es'
import type { ScopedLogger } from '#/logger'
import { errorMessage, sleep } from '#/utils'
import { type ITask, TaskStopReason } from './ITask'

export interface TaskOptions {
  /** 最大重试次数 */
  maxRetries?: number
  /** 重试间隔（毫秒）*/
  retryDelay?: number
}

export interface BaseTaskProps {
  taskName: string
  readonly logger: ScopedLogger
  options: TaskOptions
}

export abstract class BaseTask<Cfg> implements ITask<Cfg> {
  protected readonly options: Required<TaskOptions>
  protected readonly taskId: string
  protected isRunning = false
  protected readonly logger: ScopedLogger
  private _onStop: (
    id: string,
    reason: TaskStopReason,
    error?: unknown,
  ) => void = () => {}

  protected abstract execute(): Promise<void>

  constructor({ taskName, logger, options }: BaseTaskProps) {
    this.options = {
      maxRetries: 3, // 默认重试3次
      retryDelay: 2000, // 默认延迟2秒
      ...options,
    }
    this.taskId = uniqueId(taskName)
    this.logger = logger.scope(taskName)
  }

  public getTaskId(): string {
    return this.taskId
  }

  public onStop(
    cb: (id: string, reason: TaskStopReason, error?: unknown) => void,
  ) {
    this._onStop = cb
  }

  public abstract start(): void

  public stop(): void {
    if (this.isRunning) {
      this.logger.info('停止任务……')
      this.internalStop(TaskStopReason.MANUAL)
    }
  }

  /** 带错误重试的任务运行，当超过最大重试次数时自动停止任务 */
  protected async runWithRetries(): Promise<void> {
    const maxRetries = this.options.maxRetries

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // 每次循环前检查任务是否已被外部停止
      if (!this.isRunning) {
        this.logger.warn('任务已被中止')
        break
      }

      try {
        await this.execute()
        return
      } catch (error) {
        this.logger.error(
          `第 ${attempt + 1}/${this.options.maxRetries} 次执行失败：${errorMessage(error)}`,
        )

        this.onRetryError()

        if (attempt >= maxRetries - 1) {
          this.internalStop(
            TaskStopReason.ERROR,
            new Error('达到最大重试次数，任务失败。'),
          )
          break
        }

        // 等待一段时间再进行下一次尝试
        await sleep(this.options.retryDelay)
      }
    }
  }

  protected internalStop(reason: TaskStopReason, err?: unknown) {
    if (!this.isRunning) return
    this.isRunning = false
    // 调用回调，通知管理者！
    this._onStop(this.taskId, reason, err)
  }

  /** 执行的过程中发生错误就调用该函数 */
  protected abstract onRetryError(): void
}
