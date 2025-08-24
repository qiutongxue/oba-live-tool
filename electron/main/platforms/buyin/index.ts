import type { Page } from 'playwright'
import { buyin as constants } from '#/constants'
import type { BrowserSession } from '#/tasks/connection/types'
// 百应和抖店共用
import { douyinElementFinder as elementFinder } from '../douyin/element-finder'
import {
  comment,
  connect,
  ensurePage,
  toggleButton,
  virtualScroller,
} from '../helper'
import type { IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { REGEXPS, SELECTORS, URLS } from './constant'

const { login: loginConstants } = constants
const PLATFORM_NAME = '巨量百应' as const

/**
 * 巨量百应
 */
export class BuyinPlatform
  implements IPlatform, IPerformPopup, IPerformComment
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  private mainPage: Page | null = null

  get platformName() {
    return PLATFORM_NAME
  }

  async connect(browserSession: BrowserSession) {
    const { page } = browserSession
    const isConnected = await connect(page, {
      isInLiveControlSelector: SELECTORS.IN_LIVE_CONTROL,
      liveControlUrl: URLS.LIVE_CONTROL_PAGE,
      loginUrlRegex: REGEXPS.LOGIN_PAGE,
    })
    if (isConnected) {
      this.mainPage = page
    }
    return isConnected
  }

  async login(browserSession: BrowserSession) {
    // 进入登录页面
    // 抖店目前 (2025.6.29) 有一个小反爬，会打乱登录页面的样式
    // 解决方法：通过控件主动打开登录页面
    const [newPage] = await Promise.all([
      browserSession.context.waitForEvent('page'),
      browserSession.page.evaluate(loginUrl => {
        const el = document.createElement('a')
        el.href = loginUrl
        el.target = '_blank'
        el.click()
      }, loginConstants.loginUrl),
    ])
    await browserSession.page.close()
    browserSession.page = newPage

    await browserSession.page.waitForSelector(
      loginConstants.isLoggedInSelector,
      {
        timeout: 0,
      },
    )
  }

  async getAccountName(session: BrowserSession) {
    await session.page.waitForSelector(loginConstants.accountNameSelector)
    const accountName = await session.page
      .$(loginConstants.accountNameSelector)
      .then(el => el?.textContent())
    return accountName ?? ''
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performPopup(id: number): Promise<void> {
    ensurePage(this.mainPage)
    const item = await virtualScroller(this.mainPage, elementFinder, id)
    const popupBtn = await elementFinder.getPopUpButtonFromGoodsItem(item)

    await toggleButton(popupBtn, '取消讲解', '讲解')
  }

  async performComment(message: string, pinTop: boolean) {
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
}
