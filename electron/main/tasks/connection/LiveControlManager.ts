import * as constants from '#/constants'
import { createLogger } from '#/logger'
import { isDev } from '#/utils'
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

    const authenticatedSession = await this.loginManager.ensureAuthenticated(
      initialSession,
      config.headless,
    )

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
}
