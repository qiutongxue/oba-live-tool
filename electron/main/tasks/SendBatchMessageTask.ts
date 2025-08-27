import { uniqueId } from 'lodash-es'
import { insertRandomSpaces, randomInt, replaceVariant, sleep } from '#/utils'
import type { IPerformComment } from './../platforms/IPlatform'
import { type ITask, TaskStopReason } from './ITask'

export class SendBatchMessageTask implements ITask {
  private isRunning = false
  private readonly taskId = uniqueId('batch-message-task')
  private _onStopCallback: (
    id: string,
    reason: TaskStopReason,
    error?: unknown,
  ) => void = () => {}

  constructor(
    private platform: IPerformComment,
    private config: SendBatchMessagesConfig,
  ) {}

  getTaskId(): string {
    return this.taskId
  }

  start(): void {
    this.isRunning = true
    this.execute()
  }

  onStop(
    callback: (id: string, reason: TaskStopReason, error?: unknown) => void,
  ): void {
    this._onStopCallback = callback
  }

  async execute() {
    try {
      const { messages, count } = this.config
      for (let i = 0; i < count; i++) {
        if (!this.isRunning) {
          break
        }
        const messageIndex = randomInt(0, messages.length - 1)
        let message = replaceVariant(messages[messageIndex])
        if (!this.config.noSpace) {
          message = insertRandomSpaces(message)
        }

        await this.platform.performComment(message)
        // 以防万一，加一个 1s 的小停顿
        await sleep(1000)
      }
      this.isRunning = false
      this._onStopCallback('', TaskStopReason.COMPLETED)
    } catch (error) {
      this.isRunning = false
      this._onStopCallback('', TaskStopReason.ERROR, error)
    }
  }

  stop(): void {
    this.isRunning = false
    this._onStopCallback('', TaskStopReason.MANUAL)
  }
}
