import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager2'
import { BrowserSessionManager } from '#/tasks/connection/BrowserSessionManager'
import { errorMessage, typedIpcMainHandle } from '#/utils'

const TASK_NAME = '中控台'

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.connect,
    async (_, { chromePath, headless, storageState, platform, account }) => {
      const browserManager = BrowserSessionManager.getInstance()
      if (chromePath) {
        browserManager.setChromePath(chromePath)
      }

      const accountSession = await accountManager.createSession(
        platform,
        account,
      )

      try {
        const { accountName } = await accountSession.connect({
          headless,
          storageState,
        })
        return {
          accountName,
        }
      } catch (error) {
        const logger = createLogger(`${TASK_NAME} ${account.name}}`)
        logger.error('连接直播控制台失败:', errorMessage(error))

        accountSession.disconnect()

        return null
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.disconnect,
    async (_, accountId) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        accountSession.disconnect()
        return true
      } catch (error) {
        const logger = createLogger(
          `TASK_NAME @${accountManager.getAccountName(accountId)}`,
        )
        logger.error('断开连接失败:', errorMessage(error))
        return false
      }
    },
  )
}

export function setupLiveControlIpcHandlers() {
  setupIpcHandlers()
}
