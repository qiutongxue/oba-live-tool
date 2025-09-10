import type { Page } from 'playwright'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { sleep } from '#/utils'
import {
  comment,
  connect,
  ensurePage,
  getAccountName,
  virtualScroller,
} from '../helper'
import type { IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { REGEXPS, SELECTORS, URLS } from './constant'
import { kuaishouElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '快手小店' as const

export class KuaishouPlatform
  implements IPlatform, IPerformPopup, IPerformComment
{
  readonly _isPerformPopup = true
  readonly _isPerformComment = true
  private mainPage: Page | null = null

  async connect(browserSession: BrowserSession): Promise<boolean> {
    const { page } = browserSession
    const isConnected = await connect(page, {
      isInLiveControlSelector: SELECTORS.IN_LIVE_CONTROL,
      liveControlUrl: URLS.LIVE_CONTROL,
      loginUrlRegex: REGEXPS.LOGIN_PAGE,
    })

    if (isConnected) {
      // 快手小店会弹出莫名其妙的窗口，按 ESC 关闭
      await Promise.race([
        page.waitForSelector(SELECTORS.DRIVER_POPOVER),
        sleep(5000),
      ])
      while (await page.$(SELECTORS.DRIVER_POPOVER)) {
        await page.press('body', 'Escape')
        await sleep(1000)
      }
      this.mainPage = page
    }

    return isConnected
  }

  async login(browserSession: BrowserSession): Promise<void> {
    if (!REGEXPS.LOGIN_PAGE.test(browserSession.page.url())) {
      await browserSession.page.goto(URLS.LOGIN_PAGE)
    }
    await browserSession.page.waitForSelector(SELECTORS.LOGGED_IN, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession): Promise<string> {
    const accountName = await getAccountName(
      session.page,
      SELECTORS.ACCOUNT_NAME,
    )
    return accountName ?? ''
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performComment(message: string, pinTop?: boolean): Promise<boolean> {
    ensurePage(this.mainPage)
    await comment(this.mainPage, elementFinder, message, pinTop)
    return !!pinTop
  }

  getCommentPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  async performPopup(id: number): Promise<void> {
    ensurePage(this.mainPage)
    const item = await virtualScroller(this.mainPage, elementFinder, id)
    const button = await elementFinder.getPopUpButtonFromGoodsItem(item)
    const buttonText = (await button.textContent())?.trim()
    if (buttonText !== '结束讲解' && buttonText !== '开始讲解') {
      throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
    }
    await button.dispatchEvent('click')
    // 判断是否会出现 modal
    const modalNextButton = await this.mainPage
      .waitForSelector(SELECTORS.goodsItem.POPUP_CONFIRM_BUTTON, {
        timeout: 500,
      })
      .catch(() => null)
    // 出现了就点击“确定”
    if (modalNextButton) {
      await modalNextButton.dispatchEvent('click')
    }

    // 结束讲解 - 需要再次开始讲解
    if (buttonText === '结束讲解') {
      // 为了以防万一等待一段时间
      await sleep(100)
      // 注意：此时无法使用原先的按钮，需要重新查找
      const newButton = await elementFinder.getPopUpButtonFromGoodsItem(item)
      const newButtonText = await newButton.textContent()
      if (newButtonText !== '开始讲解') {
        throw new Error(`无法开始新的讲解，讲解按钮为：${newButtonText}`)
      }
      newButton.dispatchEvent('click')
    }
  }

  getPopupPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
