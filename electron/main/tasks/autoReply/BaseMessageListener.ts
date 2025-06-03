import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import type { WebSocketService } from '#/services/WebSocketService'
import type { Account } from '#/taskManager'
import windowManager from '#/windowManager'

export abstract class BaseMessageListener {
  protected logger: ReturnType<typeof createLogger>
  protected account: Account
  constructor(
    account: Account,
    taskName: string,
    protected wsService?: WebSocketService,
  ) {
    this.account = account
    this.logger = createLogger(`${taskName} @${account.name}`)
  }

  abstract start(): Promise<void>
  abstract stop(): void

  protected broadcastMessage(message: DouyinLiveMessage) {
    const comment: DouyinLiveMessage = {
      ...message,
      time: new Date().toLocaleTimeString(),
    }
    windowManager.sendToWindow(
      'main',
      IPC_CHANNELS.tasks.autoReply.showComment,
      {
        accountId: this.account.id,
        comment: comment,
      },
    )

    this.wsService?.broadcast(comment)
  }
}
