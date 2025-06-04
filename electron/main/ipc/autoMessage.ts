import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import { MessageManager } from '#/tasks/autoMessage'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动发言'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.start,
    async (_, config) => {
      try {
        pageManager.register(
          TASK_NAME,
          (page, account) => new MessageManager(page, account, config),
        )
        pageManager.startTask(TASK_NAME)
        return true
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} @${pageManager.currentAccountName}`,
        )
        logger.error(
          '启动自动发言失败:',
          error instanceof Error ? error.message : error,
        )
        return false
      }
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoMessage.stop, async () => {
    pageManager.stopTask(TASK_NAME)
    return true
  })

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.sendBatchMessages,
    async (_, messages, count) => {
      const page = pageManager.getPage()
      return MessageManager.sendBatchMessages(page, messages, count)
    },
  )
}

export function setupAutoMessageIpcHandlers() {
  setupIpcHandlers()
}
