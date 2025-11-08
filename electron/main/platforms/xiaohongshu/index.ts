import type { Page } from 'playwright'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import {
  comment,
  connect,
  ensurePage,
  getAccountName,
  toggleButton,
  virtualScroller,
} from '../helper'
import type { IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { REGEXPS, SELECTORS, TEXTS, URLS } from './constant'
import { xiaohongshuElementFinder as elementFinder } from './elment-finder'

const PLATFORM_NAME = '小红书' as const

/**
 * 小红书（千帆）
 */
export class XiaohongshuPlatform
  implements IPlatform, IPerformPopup, IPerformComment
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  private mainPage: Page | null = null

  async connect(browserSession: BrowserSession) {
    const { page } = browserSession
    const isConnected = await connect(page, {
      isInLiveControlSelector: SELECTORS.IN_LIVE_CONTROL,
      liveControlUrl: URLS.LIVE_CONTROL_PAGE,
      loginUrlRegex: REGEXPS.LOGIN_PAGE,
    })

    if (isConnected) {
      // 小红书反爬，直接用 goto 进入中控台加载不出元素
      // TODO: 之前的方法是前往首页后点击元素跳转，这次改为直接生成一个控件利用控件跳转，需要测试该功能是否能用
      const [newPage] = await Promise.all([
        browserSession.context.waitForEvent('page'),
        browserSession.page.evaluate(url => {
          const el = document.createElement('a')
          el.href = url
          el.target = '_blank'
          el.click()
        }, URLS.LIVE_CONTROL_PAGE),
      ])
      await page.close()
      browserSession.page = newPage
      this.mainPage = newPage
    }
    return isConnected
  }

  async login(browserSession: BrowserSession): Promise<void> {
    const { page } = browserSession
    if (!REGEXPS.LOGIN_PAGE.test(page.url())) {
      await page.goto(URLS.LOGIN_PAGE)
    }
    await page.waitForSelector(SELECTORS.LOGGED_IN, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession) {
    const element = await session.page.waitForSelector(
      SELECTORS.ACCOUNT_NAME_HOVER,
    )
    await element.hover()
    const accountName = await getAccountName(
      session.page,
      SELECTORS.ACCOUNT_NAME,
    )
    return accountName ?? ''
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performPopup(id: number) {
    ensurePage(this.mainPage)
    const item = await virtualScroller(this.mainPage, elementFinder, id)
    const btn = await elementFinder.getPopUpButtonFromGoodsItem(item)
    await toggleButton(btn, TEXTS.POPUP_BUTTON_CANCLE, TEXTS.POPUP_BUTTON)
  }

  async performComment(message: string, pinTop?: boolean): Promise<boolean> {
    ensurePage(this.mainPage)
    const result = await comment(this.mainPage, elementFinder, message, pinTop)
    return result.pinTop
  }

  getPopupPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  getCommentPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
