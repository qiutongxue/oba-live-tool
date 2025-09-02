import type { ScopedLogger } from '#/logger'
import { insertRandomSpaces, randomInt, replaceVariant, sleep } from '#/utils'
import type { IPerformComment } from './../platforms/IPlatform'
import { BaseTask } from './BaseTask'
import { TaskStopReason } from './ITask'

const TASK_NAME = '一键评论'

export class SendBatchMessageTask extends BaseTask<SendBatchMessagesConfig> {
  constructor(
    private platform: IPerformComment,
    private config: SendBatchMessagesConfig,
    logger: ScopedLogger,
  ) {
    super({
      taskName: TASK_NAME,
      logger,
    })
  }

  getTaskId(): string {
    return this.taskId
  }

  start(): void {
    this.isRunning = true
    this.execute()
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
        this.logger.success(`成功发送第 ${i + 1}/${count} 条评论：${message}`)
        // 以防万一，加一个 1s 的小停顿
        await sleep(1000)
      }
      this.isRunning = false
      this.internalStop(TaskStopReason.COMPLETED)
    } catch (error) {
      this.isRunning = false
      this.internalStop(TaskStopReason.ERROR, error)
    }
  }
}
