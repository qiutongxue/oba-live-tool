import type playwright from 'playwright'
import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { findChromium } from '#/utils/checkChrome'

export interface BrowserSession {
  browser: playwright.Browser
  context: playwright.BrowserContext
  page: playwright.Page
}

export interface BrowserConfig {
  headless?: boolean
  storageState?: string
}

export type StorageState = playwright.BrowserContextOptions['storageState']

chromium.use(stealth())

export class BrowserSessionManager {
  private chromePath: string | null = null
  private static instance: BrowserSessionManager

  private constructor() {}

  public static getInstance() {
    if (!BrowserSessionManager.instance) {
      BrowserSessionManager.instance = new BrowserSessionManager()
    }
    return BrowserSessionManager.instance
  }

  public setChromePath(path: string) {
    this.chromePath = path
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

  public async createSession(
    headless = true,
    storageState?: StorageState,
  ): Promise<BrowserSession> {
    const browser = await this.createBrowser(headless)
    const context = await browser.newContext({
      viewport: null, // 显式设置 null，关闭固定视口
      storageState,
    })
    const page = await context.newPage()
    return { browser, context, page }
  }
}
