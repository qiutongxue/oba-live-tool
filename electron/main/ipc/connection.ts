import type { BatchAccountResult } from 'shared/electron-api'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { browserManager } from '#/managers/BrowserSessionManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '中控台'

type ConnectParams = {
  chromePath?: string
  headless?: boolean
  storageState?: string
  platform: LiveControlPlatform
  account: Account
}

/** 连接单个账号，失败时抛出错误由调用方决定如何处理 */
async function connectOne({ chromePath, headless, storageState, platform, account }: ConnectParams) {
  if (chromePath) {
    browserManager.setChromePath(chromePath)
  }
  const accountSession = accountManager.createSession(platform, account)
  await accountSession.connect({ headless, storageState })
}

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.connect,
    async (_, { chromePath, headless, storageState, platform, account }) => {
      try {
        await connectOne({ chromePath, headless, storageState, platform, account })
        return true
      } catch (error) {
        const logger = createLogger(`@${account.name}`).scope(TASK_NAME)
        logger.error('连接直播控制台失败：', error)
        accountManager.closeSession(account.id)
        return false
      }
    },
  )

  /**
   * 批量连接多个账号（多账号独立登录）。
   * 每个账号拥有独立 browser + context + storageState，互不共享登录态。
   * 串行执行：需要登录时会弹出有头浏览器，避免多个登录窗口同时弹出互相干扰。
   */
  typedIpcMainHandle(IPC_CHANNELS.tasks.liveControl.connectAccounts, async (_, params) => {
    const results: BatchAccountResult[] = []
    for (const item of params) {
      const { account } = item
      try {
        await connectOne(item)
        results.push({ accountId: account.id, success: true })
      } catch (error) {
        const logger = createLogger(`@${account.name}`).scope(TASK_NAME)
        logger.error('批量连接账号失败：', error)
        accountManager.closeSession(account.id)
        results.push({
          accountId: account.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return results
  })

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
