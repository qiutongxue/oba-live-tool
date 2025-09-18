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
import { taobaoElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '淘宝' as const

/**
 * 淘宝
 */
export class TaobaoPlatform
  implements IPlatform, IPerformPopup, IPerformComment
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  private mainPage: Page | null = null

  async connect(session: BrowserSession): Promise<boolean> {
    const { page } = session
    const isAccessed = await connect(page, {
      liveControlUrl: URLS.LIVE_LIST, // 直播计划页面
      isInLiveControlSelector: SELECTORS.IN_LIVE_LIST,
      loginUrlRegex: REGEXPS.LOGIN_PAGE,
    })

    if (!isAccessed) {
      return false
    }

    // 淘宝需要在直播计划中获取到直播间 id，再通过 id 进入中控台
    try {
      const liveIdWrapper = await session.page.waitForSelector(
        SELECTORS.LIVE_ID,
        {
          timeout: 5000,
        },
      )
      const liveId = await liveIdWrapper.textContent()
      const liveControlUrl = `${URLS.LIVE_CONTROL_WITH_ID}${liveId}`
      await session.page.goto(liveControlUrl)
    } catch {
      throw new Error('找不到直播间 ID，请确认是否正在直播')
    }

    // 淘宝会弹出莫名其妙的引导界面，按 ESC 关闭
    const driverOverlay = SELECTORS.overlays.DRIVER
    await page
      .waitForSelector(driverOverlay, { timeout: 3000 })
      .catch(() => null)
    while (await page.$(driverOverlay)) {
      await page.press('body', 'Escape')
      await sleep(500)
    }

    this.mainPage = page

    return true
  }

  async login(session: BrowserSession): Promise<void> {
    if (!REGEXPS.LOGIN_PAGE.test(session.page.url())) {
      await session.page.goto(URLS.LOGIN_PAGE)
    }

    await session.page.waitForSelector(SELECTORS.LOGGED_IN, {
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

  async performPopup(id: number): Promise<void> {
    ensurePage(this.mainPage)
    const item = await virtualScroller(this.mainPage, elementFinder, id)
    const btn = await elementFinder.getPopUpButtonFromGoodsItem(item)
    // 淘宝弹窗直接点击即可
    await btn.dispatchEvent('click')
  }

  async performComment(message: string): Promise<boolean> {
    ensurePage(this.mainPage)
    await comment(this.mainPage, elementFinder, message, false)
    // 淘宝没有评论置顶
    return false
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
