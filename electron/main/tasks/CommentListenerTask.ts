import { IPC_CHANNELS } from 'shared/ipcChannels'
import type { ScopedLogger } from '#/logger'
import type { ICommentListener } from '#/platforms/IPlatform'
import { WebSocketService } from '#/services/WebSocketService'
import windowManager from '#/windowManager'
import { createTask } from './BaseTask'
import { TaskStopReason } from './ITask'

const TASK_NAME = '自动回复'

export function createCommentListenerTask(
  platform: ICommentListener,
  config: CommentListenerConfig,
  account: Account,
  _logger: ScopedLogger,
) {
  const logger = _logger.scope(TASK_NAME)
  let wsService: WebSocketService | null

  async function execute() {
    try {
      if (config.ws) {
        wsService = new WebSocketService()
        // WebSocket 服务启动失败不会影响评论监听
        wsService.start(config.ws.port).catch(_ => {
          wsService?.stop()
          wsService = null
        })
      }
      await platform.startCommentListener(broadcastMessage, config.source)
      logger.info('开始监听评论')
    } catch (err) {
      // 失败了还要告诉渲染层关闭按钮
      windowManager.send(IPC_CHANNELS.tasks.autoReply.listenerStopped, account.id)
      task.stop(TaskStopReason.ERROR, err)
    }
  }

  function broadcastMessage(message: DouyinLiveMessage) {
    const comment: DouyinLiveMessage = {
      ...message,
      time: new Date().toLocaleTimeString(),
    }
    windowManager.send(IPC_CHANNELS.tasks.autoReply.showComment, {
      accountId: account.id,
      comment: comment,
    })

    wsService?.broadcast(comment)
  }

  function updateConfig(cfg: Partial<CommentListenerConfig>) {
    if (cfg.ws && cfg.ws.port !== config.ws?.port) {
      config.ws = cfg.ws
      if (!wsService) {
        wsService = new WebSocketService()
      }
      wsService.stop()
      wsService.start(config.ws.port)
    }
    if (cfg.source && config.source !== cfg.source) {
      config.source = cfg.source
      platform.stopCommentListener()
      platform.startCommentListener(broadcastMessage, cfg.source)
    }
  }

  const task = createTask(
    {
      taskName: TASK_NAME,
      logger,
    },
    {
      onStart: () => {
        execute()
      },
      onStop: () => {
        platform.stopCommentListener()
        wsService?.stop()
        wsService = null
      },
    },
  )

  return {
    ...task,
    updateConfig,
  }
}
