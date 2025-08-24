import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager2'
import { contextManager } from '#/managers/BrowserContextManager'
import { BrowserSessionManager } from '#/tasks/connection/BrowserSessionManager'
import { typedIpcMainHandle } from '#/utils'

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
        const logger = createLogger(TASK_NAME)
        logger.error(
          '连接直播控制台失败:',
          error instanceof Error ? error.message : String(error),
        )

        accountSession.disconnect()

        return null
      }
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.tasks.liveControl.disconnect, async () => {
    try {
      const currentContext = contextManager.getCurrentContext()
      await currentContext.browser.close()
      return true
    } catch (error) {
      const logger = createLogger(TASK_NAME)
      logger.error(
        '断开连接失败:',
        error instanceof Error ? error.message : String(error),
      )
      return false
    }
  })
}

export function setupLiveControlIpcHandlers() {
  setupIpcHandlers()
}
