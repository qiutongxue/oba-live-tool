import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { contextManager } from '#/managers/BrowserContextManager'
import { taskManager } from '#/managers/TaskManager'
import { AutoMessageTask } from '#/tasks/autoMessage'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动发言'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.start,
    async (_, config) => {
      try {
        taskManager.register(
          TASK_NAME,
          (page, account) => new AutoMessageTask(page, account, config),
        )
        taskManager.startTask(TASK_NAME)
        return true
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} @${accountManager.getActiveAccount().name}`,
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
    taskManager.stopTask(TASK_NAME)
    return true
  })

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.sendBatchMessages,
    async (_, messages, count) => {
      const page = contextManager.getCurrentContext().page
      return AutoMessageTask.sendBatchMessages(page, messages, count)
    },
  )
}

export function setupAutoMessageIpcHandlers() {
  setupIpcHandlers()
}
