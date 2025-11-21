import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { browserManager } from '#/managers/BrowserSessionManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '中控台'

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.connect,
    async (_, { chromePath, headless, storageState, platform, account }) => {
      if (chromePath) {
        browserManager.setChromePath(chromePath)
      }

      const accountSession = await accountManager.createSession(platform, account)

      try {
        await accountSession.connect({
          headless,
          storageState,
        })
        return true
      } catch (error) {
        const logger = createLogger(`@${account.name}`).scope(TASK_NAME)
        logger.error('连接直播控制台失败：', error)

        accountManager.closeSession(account.id)
        return false
      }
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.tasks.liveControl.disconnect, async (_, accountId) => {
    try {
      accountManager.closeSession(accountId)
      return true
    } catch (error) {
      const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
      logger.error('断开连接失败：', error)
      return false
    }
  })
}

export function setupLiveControlIpcHandlers() {
  setupIpcHandlers()
}
