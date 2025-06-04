import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import type { AutoReplyConfig } from '#/tasks/autoReply'
import { AutoReplyManager } from '#/tasks/autoReply/AutoReplyManager'
import { LiveController } from '#/tasks/controller/LiveController'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '监听评论'

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.startCommentListener,
    async (_, config: AutoReplyConfig) => {
      const logger = createLogger(
        `${TASK_NAME} @${pageManager.currentAccountName}`,
      )
      try {
        if (!pageManager.contains(TASK_NAME)) {
          pageManager.register(
            TASK_NAME,
            (page, account) => new AutoReplyManager(page, account, config),
          )
        }
        await pageManager.startTask(TASK_NAME)
        return true
      } catch (error) {
        logger.error('启动失败:', error)
        return false
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.stopCommentListener,
    async () => {
      const logger = createLogger(
        `${TASK_NAME} @${pageManager.currentAccountName}`,
      )
      try {
        pageManager.stopTask(TASK_NAME)
      } catch (error) {
        logger.error(
          '停止监听评论失败:',
          error instanceof Error ? error.message : String(error),
        )
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.sendReply,
    async (_, message) => {
      const logger = createLogger(
        `${TASK_NAME} @${pageManager.currentAccountName}`,
      )
      try {
        const page = pageManager.getPage()
        const controller = new LiveController(page)
        await controller.sendMessage(message)
      } catch (error) {
        logger.error(
          '发送回复失败:',
          error instanceof Error ? error.message : String(error),
        )
        throw error
      }
    },
  )
}

export function setupAutoReplyIpcHandlers() {
  setupIpcHandlers()
}
