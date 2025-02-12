import type playwright from 'playwright'
import { pageManager } from '#/taskManager'
import windowManager from '#/windowManager'
import { ipcMain } from 'electron'
import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import {
  GOODS_ITEM_SELECTOR,
  IS_LOGGED_IN_SELECTOR,
  LIVE_CONTROL_URL,
  LOGIN_URL,
  LOGIN_URL_REGEX,
} from '../constants'
import { createLogger } from '../logger'
import { findChrome } from '../utils/checkChrome'

const TASK_NAME = '中控台'
const logger = createLogger(TASK_NAME)

interface BrowserConfig {
  headless?: boolean
  cookies?: string
}

interface BrowserSession {
  browser: playwright.Browser
  context: playwright.BrowserContext
  page: playwright.Page
}

class LiveControlManager {
  private chromePath: string | null = null
  private newCookies: string | null = null

  constructor() {
    chromium.use(stealth())
  }

  private async initChromePath() {
    if (!this.chromePath) {
      this.chromePath = await findChrome()
      if (!this.chromePath)
        throw new Error('未找到 Chrome 浏览器')
    }
  }

  private async createBrowser(headless = true): Promise<playwright.Browser> {
    await this.initChromePath()
    return chromium.launch({
      headless,
      executablePath: this.chromePath!,
    })
  }

  private async createSession(headless: boolean): Promise<BrowserSession> {
    const browser = await this.createBrowser(headless)
    const context = await browser.newContext()
    const page = await context.newPage()
    return { browser, context, page }
  }

  private async loadCookies(context: playwright.BrowserContext, cookiesString: string): Promise<boolean> {
    if (!cookiesString) {
      logger.debug('cookies 不存在')
      return false
    }

    try {
      const cookies = JSON.parse(cookiesString)
      await context.addCookies(cookies)
      return true
    }
    catch (error) {
      logger.error('加载 cookies 失败:', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  private async saveCookies(context: playwright.BrowserContext) {
    const cookies = await context.cookies()
    this.newCookies = JSON.stringify(cookies)
  }

  private async handleHeadlessLogin(session: BrowserSession): Promise<BrowserSession | null> {
    const { browser } = session
    logger.info('需要登录，切换到有头模式')
    // 关闭当前浏览器
    await browser.close()
    // 创建新的有头模式会话
    const newSession = await this.createSession(false)
    await newSession.page.goto(LOGIN_URL)

    // 等待用户登录成功
    await newSession.page.waitForSelector(IS_LOGGED_IN_SELECTOR, { timeout: 0 })
    // 保存 cookies
    await this.saveCookies(newSession.context)
    // 关闭有头浏览器，返回 null 以触发重新连接
    await newSession.browser.close()
    return null
  }

  private async handleLogin(session: BrowserSession, headless: boolean): Promise<BrowserSession | null> {
    if (headless)
      return this.handleHeadlessLogin(session)

    logger.info('需要登录，请在打开的浏览器中完成登录')
    await session.page.goto(LOGIN_URL)
    await session.page.waitForSelector(IS_LOGGED_IN_SELECTOR, { timeout: 0 })
    await this.saveCookies(session.context)
    return session
  }

  public setChromePath(path: string) {
    this.chromePath = path
  }

  public async connect({ headless = true, cookies = '' }: BrowserConfig): Promise<BrowserSession> {
    logger.info('启动中……')

    let loginSuccess = false
    let session: BrowserSession | null = null

    while (!loginSuccess) {
      try {
        session = await this.createSession(headless)

        // 加载 cookies
        await this.loadCookies(session.context, this.newCookies || cookies)

        // 访问中控台
        await session.page.goto(LIVE_CONTROL_URL)
        await Promise.race([
          session.page.waitForURL(LOGIN_URL_REGEX, { timeout: 0 }),
          session.page.waitForSelector(IS_LOGGED_IN_SELECTOR, { timeout: 0 }),
        ])

        logger.debug(`当前页面: ${session.page.url()}`)

        // 检查是否需要登录
        if (session.page.url().startsWith(LOGIN_URL)) {
          const newSession = await this.handleLogin(session, headless)
          // 对于无头模式，需要重新连接
          if (!newSession)
            continue
          session = newSession
        }
        // 每次连接都保存一次 cookies
        await this.saveCookies(session.context)
        loginSuccess = true
      }
      catch (error) {
        logger.error('连接失败:', error instanceof Error ? error.message : String(error))
        if (session?.browser)
          await session.browser.close()
        throw error
      }
    }

    if (!session)
      throw new Error('会话创建失败')

    // 等待中控台页面加载完成
    await session.page.waitForSelector(GOODS_ITEM_SELECTOR, { timeout: 0 })
    logger.success('登录成功')
    return session
  }

  public get cookies() {
    return this.newCookies
  }
}

function setupIpcHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.tasks.liveControl.connect,
    async (_, { chromePath, headless, cookies }) => {
      try {
        const manager = new LiveControlManager()
        if (chromePath)
          manager.setChromePath(chromePath)
        const { browser, context, page } = await manager.connect({ headless, cookies })

        pageManager.setSession({ browser, browserContext: context, page })

        page.on('close', () => {
          windowManager.sendToWindow('main', IPC_CHANNELS.tasks.liveControl.disconnect)
        })

        return manager.cookies
      }
      catch (error) {
        logger.error('连接直播控制台失败:', error instanceof Error ? error.message : String(error))
        return null
      }
    },
  )
}

setupIpcHandlers()
