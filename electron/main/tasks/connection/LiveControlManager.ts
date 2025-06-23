import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { isDev } from '#/utils'
import windowManager from '#/windowManager'
import { BrowserSessionManager } from './BrowserSessionManager'
import { LoginManager } from './LoginManager'
import { getPlatformAdapter } from './adapters'
import type { BaseAdapter } from './adapters/BaseAdapter'
import type { BrowserConfig, BrowserSession, StorageState } from './types'

const TASK_NAME = '中控台'

export class LiveControlManager {
  private logger = createLogger(TASK_NAME)
  private readonly browserFactory: BrowserSessionManager
  private readonly loginManager: LoginManager
  private readonly platformAdapter: BaseAdapter
  private tempSession: BrowserSession | undefined

  constructor(platform: LiveControlPlatform) {
    this.browserFactory = BrowserSessionManager.getInstance()
    this.loginManager = new LoginManager(platform)
    this.platformAdapter = getPlatformAdapter(platform)
  }

  public async connect(
    config: BrowserConfig,
  ): Promise<BrowserSession & { accountName: string | null }> {
    this.logger.info('连接中……')
    let storageState: StorageState
    if (config.storageState) {
      this.logger.info('检测到已保存登录状态')
      storageState = JSON.parse(config.storageState)
    }

    const initialSession = await this.browserFactory.createSession(
      config.headless,
      storageState,
    )
    this.tempSession = initialSession

    const authenticatedSession = await this.loginManager.ensureAuthenticated(
      initialSession,
      config.headless,
    )
    this.tempSession = authenticatedSession

    // 这个时候就已经登录成功了，可以保存登录状态，避免因为未开播还要重新登录
    const state = JSON.stringify(
      await authenticatedSession.context.storageState(),
    )
    const account = accountManager.getActiveAccount()
    windowManager.send(IPC_CHANNELS.chrome.saveState, account.id, state)

    await this.platformAdapter.afterLogin(authenticatedSession)
    const accountName =
      await this.platformAdapter.fetchAccountName(authenticatedSession)

    this.logger.success(`登录成功，当前账号为「${accountName}」`)

    return { ...authenticatedSession, accountName }
  }

  public async connectTest() {
    if (!isDev()) {
      throw new Error('该函数只能在开发环境中调用')
    }
    const session = await this.browserFactory.createSession()
    return { ...session, accountName: '测试中' }
  }

  public setChromePath(path: string) {
    this.browserFactory.setChromePath(path)
  }

  public async disconnect() {
    if (this.tempSession) {
      await this.tempSession.browser.close()
    }
  }
}
