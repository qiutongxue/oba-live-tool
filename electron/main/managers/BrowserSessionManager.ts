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

class BrowserSessionManager {
  private chromePath: string | null = null

  public setChromePath(path: string) {
    this.chromePath = path
  }

  private async getChromePathOrDefault() {
    if (!this.chromePath) {
      this.chromePath = await findChromium()
    }
    return this.chromePath
  }

  private async createBrowser(headless = true) {
    const path = await this.getChromePathOrDefault()
    return chromium.launch({
      headless,
      executablePath: path,
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

export const browserManager = new BrowserSessionManager()
