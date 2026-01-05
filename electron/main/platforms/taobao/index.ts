import { Result } from '@praha/byethrow'
import type { Page } from 'playwright'
import { PageNotFoundError } from '#/errors/PlatformError'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { sleep } from '#/utils'
import {
  comment,
  connect,
  ensurePage,
  getAccountName,
  getItemFromVirtualScroller,
  openUrlByElement,
} from '../helper'
import type { ICommentListener, IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { TaobaoCommentListener } from './commentListener'
import { REGEXPS, SELECTORS, URLS } from './constant'
import { taobaoElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '淘宝' as const

/**
 * 淘宝
 */
export class TaobaoPlatform implements IPlatform, IPerformPopup, IPerformComment, ICommentListener {
  readonly _isCommentListener = true
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  private mainPage: Page | null = null
  private commentListener: TaobaoCommentListener | null = null

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
      const liveIdWrapper = await session.page.waitForSelector(SELECTORS.LIVE_ID, {
        timeout: 5000,
      })
      const liveId = await liveIdWrapper.textContent()
      const liveControlUrl = `${URLS.LIVE_CONTROL_WITH_ID}${liveId}`
      await session.page.goto(liveControlUrl)
    } catch {
      throw new Error('找不到直播间 ID，请确认是否正在直播')
    }

    // 淘宝会弹出莫名其妙的引导界面，按 ESC 关闭
    const driverOverlay = SELECTORS.overlays.DRIVER
    await page.waitForSelector(driverOverlay, { timeout: 3000 }).catch(() => null)
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

    await session.page.waitForSelector(SELECTORS.IN_LIVE_LIST, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession): Promise<string> {
    // 需要前往首页获取
    const homePage = await openUrlByElement(session.page, URLS.HOME_PAGE)
    session.page.bringToFront()
    const accountName = (await getAccountName(homePage, SELECTORS.ACCOUNT_NAME)) ?? ''
    homePage.close()
    return accountName
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performPopup(id: number) {
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => getItemFromVirtualScroller(page, elementFinder, id)),
      Result.andThen(item => elementFinder.getPopUpButtonFromGoodsItem(item)),
      Result.inspect(btn => btn.dispatchEvent('click')),
      Result.andThen(_ => Result.succeed()),
    )
  }

  async performComment(message: string) {
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => comment(page, elementFinder, message, false)),
    )
  }

  startCommentListener(
    onComment: (comment: LiveMessage) => void,
    source: CommentListenerConfig['source'],
  ): void | Promise<void> {
    if (source !== 'taobao') {
      throw new Error('淘宝评论监听器只能用于淘宝平台')
    }
    this.commentListener = new TaobaoCommentListener(this.mainPage!, onComment)
    this.commentListener.start()
  }

  stopCommentListener(): void {
    this.commentListener?.stop()
  }

  getCommentListenerPage(): Page {
    if (!this.commentListener) {
      throw new PageNotFoundError()
    }
    return this.commentListener.getPage()
  }

  getPopupPage() {
    return ensurePage(this.mainPage)
  }

  getCommentPage() {
    return ensurePage(this.mainPage)
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
