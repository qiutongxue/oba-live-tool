import type { Page } from 'playwright'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import {
  comment,
  ensurePage,
  getAccountName,
  toggleButton,
  virtualScroller,
} from '../helper'
import type { IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { REGEXPS, SELECTORS, TEXT, URLS } from './constant'
import { wechatChannelElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '微信视频号' as const

/**
 * 微信视频号
 */
export class WechatChannelPlatform
  implements IPlatform, IPerformPopup, IPerformComment
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  private mainPage: Page | null = null
  /** 商品列表页面 */
  private productsPage: Page | null = null
  async connect(session: BrowserSession) {
    const { page } = session
    await page.goto(URLS.LIVE_CONTROL_PAGE, {
      waitUntil: 'domcontentloaded',
    })

    // 微信视频号有三种可能
    // 1. 未登录 -> 跳转登录页面
    // 2. 已登录但未开播 -> 跳转到首页
    // 3. 已登录且开播 -> 正常访问中控台
    await Promise.race([
      page.waitForURL(REGEXPS.LOGIN_PAGE, {
        timeout: 0,
      }),
      page.waitForSelector(SELECTORS.LOGIN.IN_LIVE_CONTROL, {
        timeout: 0,
      }),
      page.waitForURL(REGEXPS.INDEX_PAGE, { timeout: 0 }),
    ])

    // 未开播，跳转到首页了
    if (REGEXPS.INDEX_PAGE.test(page.url())) {
      // TODO: 此时其实是登录成功的，最好能先保存好登录状态
      throw new Error('视频号未开播的情况下无法连接到中控台，请先开播')
    }

    const isConnected = !REGEXPS.LOGIN_PAGE.test(session.page.url())

    // 视频号的商品列表不在中控台，需要额外打开新的页面
    if (isConnected) {
      this.mainPage = page
      this.productsPage = await session.context.newPage()
      await this.productsPage.goto(URLS.PRODUCTS_PAGE)
    }
    return isConnected
  }

  async login(browserSession: BrowserSession) {
    const { page } = browserSession
    if (!REGEXPS.LOGIN_PAGE.test(page.url())) {
      await page.goto(URLS.LOGIN_PAGE)
    }
    await browserSession.page.waitForSelector(SELECTORS.LOGIN.LOGGED_IN, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession): Promise<string> {
    // 视频号如果窗口过小的话无法正常获取账号名
    // 直接访问视频号首页就能搞到用户名了
    const tempPage = await session.context.newPage()
    await tempPage.goto(URLS.INDEX_PAGE)
    const accountName = await getAccountName(tempPage, SELECTORS.ACCOUNT_NAME)
    await tempPage.close()
    return accountName ?? ''
  }

  async disconnect(): Promise<void> {}

  async performPopup(id: number): Promise<void> {
    ensurePage(this.productsPage)
    const item = await virtualScroller(this.productsPage, elementFinder, id)
    const btn = await elementFinder.getPopUpButtonFromGoodsItem(item)
    await toggleButton(btn, TEXT.POPUP_BUTTON_CANCLE, TEXT.POPUP_BUTTON)
  }

  async performComment(message: string, pinTop?: boolean): Promise<boolean> {
    ensurePage(this.mainPage)
    const result = await comment(this.mainPage, elementFinder, message, pinTop)
    return result.pinTop
  }

  getPopupPage(): Page {
    ensurePage(this.productsPage)
    return this.productsPage
  }

  getCommentPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
