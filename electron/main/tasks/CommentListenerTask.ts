import { IPC_CHANNELS } from 'shared/ipcChannels'
import type { ScopedLogger } from '#/logger'
import type { ICommentListener } from '#/platforms/IPlatform'
import { WebSocketService } from '#/services/WebSocketService'
import windowManager from '#/windowManager'
import { BaseTask } from './BaseTask'
import { TaskStopReason } from './ITask'

const TASK_NAME = '自动回复'

export class CommentListenerTask extends BaseTask<CommentListenerConfig> {
  private wsService: WebSocketService | null = null

  constructor(
    private platform: ICommentListener,
    private config: CommentListenerConfig,
    private account: Account,
    logger: ScopedLogger,
  ) {
    super({
      taskName: TASK_NAME,
      logger,
    })
  }

  public async start() {
    if (this.isRunning) {
      return
    }
    this.isRunning = true
    await this.execute()
  }

  public stop() {
    super.stop()
    this.wsService?.stop()
    this.platform.stopCommentListener()
  }

  protected async execute() {
    try {
      if (this.config.ws) {
        this.wsService = new WebSocketService()
        this.wsService.start(this.config.ws.port)
      }
      await this.platform.startCommentListener(
        this.broadcastMessage.bind(this),
        this.config.source,
      )
      this.logger.log('开始监听评论')
    } catch (err) {
      this.internalStop(TaskStopReason.ERROR, err)
    }
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
}
