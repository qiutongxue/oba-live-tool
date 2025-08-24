import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager2'
import { errorMessage, typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动发言'
const TASK_TYPE: LiveControlTask['type'] = 'auto-comment'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.start,
    async (_, accountId, config) => {
      const accountSession = accountManager.getSession(accountId)
      if (!accountSession) {
        return false
      }
      try {
        await accountSession.startTask({
          type: TASK_TYPE,
          config,
        })
        return true
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} @${accountManager.getAccountName(accountId)}`,
        )
        logger.error('启动自动发言失败:', errorMessage(error))
        return false
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.stop,
    async (_, accountId) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        accountSession.stopTask(TASK_TYPE)
        return true
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} @${accountManager.getAccountName(accountId)}`,
        )
        logger.error('停止自动发言失败:', errorMessage(error))
        return false
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.sendBatchMessages,
    async (_, accountId, messages, count) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        await accountSession.startTask({
          type: 'send-batch-messages',
          config: { messages, count },
        })
        return true
      } catch {
        // TODO: 错误处理
        return false
      }
    },
  )
}

export function setupAutoMessageIpcHandlers() {
  setupIpcHandlers()
}
