import type { Page } from 'playwright'
import { createLogger } from '#/logger'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import {
  comment,
  connect,
  ensurePage,
  getAccountName,
  toggleButton,
  virtualScroller,
} from '../helper'
import type {
  ICommentListener,
  IPerformComment,
  IPerformPopup,
  IPlatform,
} from '../IPlatform'
import { CompassListener, ControlListener } from './commentListener'
import { REGEXPS, SELECTORS, TEXTS, URLS } from './constant'
import { douyinElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '抖音小店' as const

/**
 * 抖音小店
 */
export class DouyinPlatform
  implements IPlatform, IPerformPopup, IPerformComment, ICommentListener
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  readonly _isCommentListener = true

  public mainPage: Page | null = null
  private logger = createLogger('抖音小店')
  private commentListener: ICommentListener | null = null

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
      }, URLS.LOGIN_PAGE),
    ])
    await browserSession.page.close()
    browserSession.page = newPage

    await browserSession.page.waitForSelector(SELECTORS.LOGGED_IN, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession) {
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
    const popupBtn = await elementFinder.getPopUpButtonFromGoodsItem(item)

    await toggleButton(popupBtn, TEXTS.POPUP_BUTTON_CANCLE, TEXTS.POPUP_BUTTON)
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

  startCommentListener(
    onComment: (comment: DouyinLiveMessage) => void,
    source: 'control' | 'compass',
  ) {
    ensurePage(this.mainPage)
    if (source === 'control') {
      this.commentListener = new ControlListener(this.mainPage)
    } else {
      this.commentListener = new CompassListener('douyin', this.mainPage)
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

  handleComment(): void {
    throw new Error('Method not implemented.')
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
