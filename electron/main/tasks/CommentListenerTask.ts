import type { Page } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import type { ScopedLogger } from '#/logger'
import type { ICommentListener } from '#/platforms/IPlatform'
import { WebSocketService } from '#/services/WebSocketService'
import { takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import { BaseTask } from './BaseTask'

const TASK_NAME = '自动回复'

export class CommentListenerTask extends BaseTask<CommentListenerConfig> {
  private wsService: WebSocketService | null = null

  constructor(
    private page: Page,
    private platform: ICommentListener,
    private config: CommentListenerConfig,
    private account: Account,
    logger: ScopedLogger,
  ) {
    super({
      taskName: TASK_NAME,
      logger,
      options: {
        maxRetries: 1,
      },
    })
  }

  public start(): void {
    if (this.isRunning) {
      return
    }
    this.isRunning = true
    this.runWithRetries()
  }

  public stop() {
    super.stop()
    this.wsService?.stop()
    this.platform.stopCommentListener()
  }

  protected execute() {
    if (this.config.ws) {
      this.wsService = new WebSocketService()
      this.wsService.start(this.config.ws.port)
    }
    this.platform.startCommentListener(
      this.broadcastMessage.bind(this),
      this.config.source,
    )
    this.logger.log('开始监听评论')
  }

  private broadcastMessage(message: DouyinLiveMessage) {
    const comment: DouyinLiveMessage = {
      ...message,
      time: new Date().toLocaleTimeString(),
    }
    windowManager.send(IPC_CHANNELS.tasks.autoReply.showComment, {
      accountId: this.account.id,
      comment: comment,
    })

    this.wsService?.broadcast(comment)
  }

  updateConfig(cfg: Partial<CommentListenerConfig>) {
    if (cfg.ws && cfg.ws.port !== this.config.ws?.port) {
      this.config.ws = cfg.ws
      if (!this.wsService) {
        this.wsService = new WebSocketService()
      }
      this.wsService.stop()
      this.wsService.start(this.config.ws.port)
    }
    if (cfg.source && this.config.source !== cfg.source) {
      this.config.source = cfg.source
      this.platform.stopCommentListener()
      this.platform.startCommentListener(
        this.broadcastMessage.bind(this),
        cfg.source,
      )
    }
  }

  protected onRetryError(_error: unknown): void {
    takeScreenshot(this.page, TASK_NAME, this.account.name)
  }
}
