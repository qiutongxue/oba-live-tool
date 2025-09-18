import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { BrowserSessionManager } from '#/managers/BrowserSessionManager'
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
        const logger = createLogger(`@${account.name}`).scope(TASK_NAME)
        logger.error('连接直播控制台失败:', errorMessage(error))

        accountManager.closeSession(account.id)
        return null
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.disconnect,
    async (_, accountId) => {
      try {
        accountManager.closeSession(accountId)
        return true
      } catch (error) {
        const logger = createLogger(
          `@${accountManager.getAccountName(accountId)}`,
        ).scope(TASK_NAME)
        logger.error('断开连接失败:', errorMessage(error))
        return false
      }
    },
  )
}

export function setupLiveControlIpcHandlers() {
  setupIpcHandlers()
}
