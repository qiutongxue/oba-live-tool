import type { Page } from 'playwright'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { DouyinPlatform } from '../douyin'
import { CompassListener, ControlListener } from '../douyin/commentListener'
// 百应和抖店共用
import { connect, ensurePage, openUrlByElement } from '../helper'
import type {
  ICommentListener,
  IPerformComment,
  IPerformPopup,
  IPlatform,
} from '../IPlatform'
import { REGEXPS, SELECTORS, URLS } from './constant'

const PLATFORM_NAME = '巨量百应' as const

/**
 * 巨量百应
 */
export class BuyinPlatform
  implements IPlatform, IPerformPopup, IPerformComment, ICommentListener
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  readonly _isCommentListener = true

  private mainPage: Page | null = null
  private commentListener: ICommentListener | null = null

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
      // 2025.11 巨量百应的中控台和登录时一样，样式会乱，同样的解决方法
      const newPage = await openUrlByElement(page, URLS.LIVE_CONTROL_PAGE)
      browserSession.page = newPage
      this.mainPage = newPage
      await page.close()
    }
    return isConnected
  }

  async login(browserSession: BrowserSession) {
    // 进入登录页面
    // 巨量百应（2025.8）也有和抖店同样的问题
    // 解决方法：通过控件主动打开登录页面
    const newPage = await openUrlByElement(browserSession.page, URLS.LOGIN_PAGE)
    await browserSession.page.close()
    browserSession.page = newPage

    await browserSession.page.waitForSelector(SELECTORS.LOGGED_IN, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession) {
    await session.page.waitForSelector(SELECTORS.ACCOUNT_NAME)
    const accountName = await session.page
      .$(SELECTORS.ACCOUNT_NAME)
      .then(el => el?.textContent())
    return accountName ?? ''
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performPopup(id: number): Promise<void> {
    await DouyinPlatform.prototype.performPopup.call(this, id)
  }

  async performComment(message: string, pinTop: boolean) {
    return await DouyinPlatform.prototype.performComment.call(
      this,
      message,
      pinTop,
    )
  }

  startCommentListener(
    onComment: (comment: DouyinLiveMessage) => void,
    source: 'control' | 'compass',
  ) {
    ensurePage(this.mainPage)
    if (source === 'control') {
      this.commentListener = new ControlListener(this.mainPage)
    } else {
      this.commentListener = new CompassListener('buyin', this.mainPage)
    }
    return this.commentListener.startCommentListener(onComment, source)
  }

  stopCommentListener(): void {
    this.commentListener?.stopCommentListener()
  }

  getCommentListenerPage(): Page {
    if (!this.commentListener) {
      throw new Error('未找到评论监听页面')
    }
    return this.commentListener?.getCommentListenerPage() ?? this.mainPage
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
