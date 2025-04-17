import { ipcMain } from 'electron'
import type playwright from 'playwright'
import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { pageManager } from '#/taskManager'
import { typedIpcMainHandle } from '#/utils'
import type { LoginConstants } from '../constants'
import { loginConstants } from '../constants'
import { createLogger } from '../logger'
import { findChromium } from '../utils/checkChrome'

const TASK_NAME = '中控台'

type PromiseReturnType<T> = T extends Promise<infer U> ? U : T

interface BrowserConfig {
  headless?: boolean
  storageState?: string
}
interface BrowserSession {
  browser: playwright.Browser
  context: playwright.BrowserContext
  page: playwright.Page
}

class LiveControlManager {
  private chromePath: string | null = null
  private storageState: PromiseReturnType<
    ReturnType<playwright.BrowserContext['storageState']>
  > | null = null
  private loginConstants: LoginConstants
  private logger: ReturnType<typeof createLogger>

  constructor(private platform: keyof typeof loginConstants) {
    this.loginConstants = loginConstants[platform] || loginConstants.douyin
    chromium.use(stealth())
    this.logger = createLogger(TASK_NAME)
  }

  private async initChromePath() {
    if (!this.chromePath) {
      this.chromePath = await findChromium()
      if (!this.chromePath) throw new Error('未找到浏览器')
    }
  }

  private async createBrowser(headless = true): Promise<playwright.Browser> {
    await this.initChromePath()
    return chromium.launch({
      headless,
      executablePath: this.chromePath as string,
    })
  }

  private async createSession(headless: boolean): Promise<BrowserSession> {
    const browser = await this.createBrowser(headless)
    if (this.storageState) {
      const context = await browser.newContext({
        storageState: this.storageState,
      })
      const page = await context.newPage()
      return { browser, context, page }
    }
    const context = await browser.newContext()
    const page = await context.newPage()
    return { browser, context, page }
  }

  private async loadCookies(
    context: playwright.BrowserContext,
    cookiesString: string,
  ): Promise<boolean> {
    if (!cookiesString) {
      this.logger.debug('cookies 不存在')
      return false
    }

    try {
      const cookies = JSON.parse(cookiesString)
      await context.addCookies(cookies)
      return true
    } catch (error) {
      this.logger.error(
        '加载 cookies 失败:',
        error instanceof Error ? error.message : String(error),
      )
      return false
    }
  }

  // private async saveCookies(context: playwright.BrowserContext) {
  //   const cookies = await context.cookies()
  //   this.newCookies = JSON.stringify(cookies)
  // }

  private async handleHeadlessLogin(
    session: BrowserSession,
  ): Promise<BrowserSession | null> {
    const { browser } = session
    // 关闭当前浏览器
    await browser.close()
    // 创建新的有头模式会话
    const newSession = await this.createSession(false)
    await newSession.page.goto(this.loginConstants.loginUrl)

    // 等待用户登录成功
    await newSession.page.waitForSelector(
      this.loginConstants.isLoggedInSelector,
      { timeout: 0 },
    )
    // 保存状态
    this.storageState = await newSession.context.storageState()
    // 关闭有头浏览器，返回 null 以触发重新连接
    await newSession.browser.close()
    return null
  }

  private async handleLogin(
    session: BrowserSession,
    headless: boolean,
  ): Promise<BrowserSession | null> {
    this.logger.info('需要登录，请在打开的浏览器中完成登录')
    if (headless) return this.handleHeadlessLogin(session)

    await session.page.goto(this.loginConstants.loginUrl)
    await session.page.waitForSelector(this.loginConstants.isLoggedInSelector, {
      timeout: 0,
    })

    if (this.platform !== 'douyin') {
      // 除了抖音外都手动跳转一下
      await session.page.goto(this.loginConstants.liveControlUrl)
    }
    // 保存状态
    this.storageState = await session.context.storageState()
    return session
  }

  public setChromePath(path: string) {
    this.chromePath = path
  }

  public async connect({
    headless = true,
    storageState = '',
  }: BrowserConfig): Promise<BrowserSession & { accountName: string | null }> {
    this.logger.info('启动中……')

    let loginSuccess = false
    let session: BrowserSession | null = null

    if (storageState) {
      this.storageState = JSON.parse(storageState)
    }

    while (!loginSuccess) {
      try {
        session = await this.createSession(headless)

        // 访问中控台
        await session.page.goto(this.loginConstants.liveControlUrl)
        await Promise.race([
          // 需要登录
          session.page.waitForURL(this.loginConstants.loginUrlRegex, {
            timeout: 0,
          }),
          // 成功进入了中控台
          session.page.waitForSelector(
            this.loginConstants.isInLiveControlSelector,
            { timeout: 0 },
          ),
        ])

        this.logger.debug(`当前页面: ${session.page.url()}`)

        // 检查是否需要登录
        if (this.loginConstants.loginUrlRegex.test(session.page.url())) {
          const newSession = await this.handleLogin(session, headless)
          // 对于无头模式，需要重新连接
          if (!newSession) continue
          session = newSession
        }

        loginSuccess = true
      } catch (error) {
        this.logger.error(
          '连接失败:',
          error instanceof Error ? error.message : String(error),
        )
        if (session?.browser) await session.browser.close()
        throw error
      }
    }

    if (!session) throw new Error('会话创建失败')

    // 获取当前登录的账号
    await session.page.waitForSelector(this.loginConstants.accountNameSelector)
    const accountName = await session.page
      .$(this.loginConstants.accountNameSelector)
      .then(el => el?.textContent())
    this.logger.success(`登录成功，当前账号为「${accountName}」`)
    return {
      ...session,
      accountName: accountName || null,
    }
  }
}

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.liveControl.connect,
    async (_, { chromePath, headless, storageState, platform = 'douyin' }) => {
      try {
        const manager = new LiveControlManager(platform || 'douyin')
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
        console.log(state)
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
      await pageManager.getPage()?.close()
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

setupIpcHandlers()
