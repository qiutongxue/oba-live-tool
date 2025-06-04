import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import { LiveControlManager } from '#/tasks/connection/LiveControlManager'
import { isDev, isMockTest, typedIpcMainHandle } from '#/utils'

const TASK_NAME = '中控台'

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.connect,
    async (_, { chromePath, headless, storageState, platform = 'douyin' }) => {
      try {
        const manager = new LiveControlManager(platform)
        if (chromePath) manager.setChromePath(chromePath)
        const { browser, context, page, accountName } = await manager.connect({
          headless,
          storageState,
        })

        pageManager.setContext({
          browser,
          browserContext: context,
          page,
          platform,
        })

        const state = JSON.stringify(await context.storageState())
        return {
          storageState: state,
          accountName,
        }
      } catch (error) {
        const logger = createLogger(TASK_NAME)
        logger.error(
          '连接直播控制台失败:',
          error instanceof Error ? error.message : String(error),
        )
        return null
      }
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.tasks.liveControl.disconnect, async () => {
    try {
      const currentContext = pageManager.getContext()
      await currentContext?.browser.close()
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

function setupDevIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.connect,
    async (_, { platform = 'douyin' }) => {
      const manager = new LiveControlManager(platform)
      const { browser, context, page, accountName } =
        await manager.connectTest()
      pageManager.setContext({
        browser,
        browserContext: context,
        page,
        platform,
      })
      return {
        storageState: '',
        accountName,
      }
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.tasks.liveControl.disconnect, () => {
    pageManager.getContext()?.browser.close()
    return true
  })
}

export function setupLiveControlIpcHandlers() {
  if (isDev() && isMockTest()) {
    setupDevIpcHandlers()
  } else {
    setupIpcHandlers()
  }
}
