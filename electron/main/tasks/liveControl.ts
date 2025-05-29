import type playwright from 'playwright'
import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { pageManager } from '#/taskManager'
import { isDev, sleep, typedIpcMainHandle } from '#/utils'
import * as constants from '../constants'
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

  constructor(private platform: LiveControlPlatform) {
    // constants[platform]
    this.loginConstants = constants[platform].login // loginConstants[platform] || loginConstants.douyin
    chromium.use(stealth())
    this.logger = createLogger(TASK_NAME)
  }

  private async initChromePath() {
    if (!this.chromePath) {
      this.chromePath = await findChromium()
      if (!this.chromePath) throw new Error('未找到浏览器')
    }
  }

  private async createBrowser(headless = true) {
    await this.initChromePath()
    return chromium.launch({
      headless,
      executablePath: this.chromePath as string,
    })
  }

  private async createSession(headless: boolean): Promise<BrowserSession> {
    const browser = await this.createBrowser(headless)

    const context = await browser.newContext(
      this.storageState
        ? {
            storageState: this.storageState,
          }
        : undefined,
    )
    const page = await context.newPage()
    return { browser, context, page }
  }

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

        if (this.platform === 'wxchannel') {
          const indexRegex = /platform\/?$/
          await Promise.race([
            // 需要登录
            session.page.waitForURL(this.loginConstants.loginUrlRegex, {
              timeout: 0,
            }),
            // 已开播就会直接进入中控台
            session.page.waitForSelector(
              this.loginConstants.isInLiveControlSelector,
              { timeout: 0 },
            ),
            // 未开播会跳转到首页！
            session.page.waitForURL(indexRegex, {
              timeout: 0,
            }),
          ])

          if (indexRegex.test(session.page.url())) {
            // 未开播，直接抛出错误
            throw new Error('视频号未开播的情况下无法连接到中控台，清先开播')
          }
        } else {
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
        }

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
        if (session?.browser) await session.browser.close()
        throw error
      }
    }

    if (!session) throw new Error('会话创建失败')

    // 小红书反爬，直接访问无法正常加载元素，需要绕开
    if (this.platform === 'redbook') {
      // 1. 先回到首页
      await session.page.goto('https://ark.xiaohongshu.com/')
      // 2. 点击左侧 sidebar 的直播中控台
      // 等内容菜单出现（防止因为加载慢导致获取出错
      await session.page.waitForSelector('#root-menu-wrapper .menu-item')
      // 菜单子项中找到直播中控台
      // 因为不同账号的权限不同，菜单的内容也不同，所以就直接遍历所有子项
      const contentMenuItems = await session.page.$$(
        '#root-menu-wrapper .menu-item',
      )
      for (const item of contentMenuItems) {
        const text = await item.textContent()
        if (text === '直播中控台') {
          await item.click()
          // 等新页面出现
          await sleep(1000)
          break
        }
      }
      // 保留新页面作为当前页面
      for (const page of session.context.pages()) {
        if (page.url().includes('live_center_control')) {
          const prevPage = session.page
          session.page = page
          await prevPage.close()
          break
        }
      }
    }

    // 微信视频号的弹窗不在中控台，需要额外开启一个页面
    if (this.platform === 'wxchannel') {
      const popUpPage = await session.context.newPage()
      await popUpPage.goto(
        'https://channels.weixin.qq.com/platform/live/commodity/onsale/index',
      )
    }
    // 快手小店会弹出莫名其妙的窗口，按 ESC 关闭
    if (this.platform === 'kuaishou') {
      await Promise.race([
        session.page.waitForSelector('#driver-page-overlay'),
        sleep(5000),
      ])
      while (await session.page.$('#driver-page-overlay')) {
        await session.page.press('body', 'Escape')
        await sleep(1000)
      }
    }

    // 需要鼠标悬停才能获取到用户名（小红书）
    if (this.loginConstants.hoverSelector) {
      await session.page.hover(this.loginConstants.hoverSelector)
    }

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

if (isDev()) {
  typedIpcMainHandle(IPC_CHANNELS.tasks.liveControl.connect, () => {
    return {
      accountName: '测试中',
      storageState: null,
    }
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.liveControl.disconnect, () => {
    return true
  })
} else {
  setupIpcHandlers()
}
