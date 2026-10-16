import { Result } from '@praha/byethrow'
import type { Page } from 'playwright'
import { AbortError, UnexpectedError } from '#/errors/AppError'
import type { PlatformError } from '#/errors/PlatformError'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { AsyncLock } from '#/utils'
import {
  comment,
  connect,
  ensurePage,
  getAccountName,
  getItemFromVirtualScroller,
  toggleButton,
} from '../helper'
import type { IMarketingTool, IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { REGEXPS, SELECTORS, TEXTS, URLS } from './constant'
import { douyinEosElementFinder as elementFinder } from './element-finder'
import {
  readCoupons,
  readGiftBagTemplates,
  sendCouponOnPage,
  sendGiftBagByIndex,
} from './marketing'

const PLATFORM_NAME = '抖音团购' as const

/**
 * 抖音团购
 */
export class DouyinEosPlatform
  implements IPlatform, IPerformPopup, IPerformComment, IMarketingTool
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  readonly _isMarketingTool = true
  public mainPage: Page | null = null

  /**
   * 页面级互斥锁：本平台所有 DOM 操作都排队执行。
   * 「自动弹窗」「自动发言」「营销循环」共用同一个页面，任何一方的操作都会让页面
   * 重渲染、把另一方刚拿到的 ElementHandle 挤掉（报 not attached to the DOM）；
   * 串行化之后这些任务就能**同时运行**而不互相干扰。
   *
   * 注意：不能在锁内再去抢同一把锁（会死锁），所以这里只在最外层包一次。
   */
  private readonly pageLock = new AsyncLock()

  async connect(browserSession: BrowserSession) {
    const { page } = browserSession
    const isConnected = await connect(page, {
      isInLiveControlSelector: SELECTORS.IN_LIVE_CONTROL,
      liveControlUrl: URLS.LIVE_CONTROL,
      loginUrlRegex: REGEXPS.LOGIN_PAGE,
    })
    if (isConnected) {
      this.mainPage = page
    }
    return isConnected
  }

  async login(browserSession: BrowserSession) {
    if (!REGEXPS.LOGIN_PAGE.test(browserSession.page.url())) {
      await browserSession.page.goto(URLS.LOGIN_PAGE)
    }
    await browserSession.page.waitForSelector(SELECTORS.LOGGED_IN, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession) {
    const accountName = await getAccountName(session.page, SELECTORS.ACCOUNT_NAME)
    return accountName ?? ''
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performPopup(id: number, signal?: AbortSignal) {
    return this.pageLock.run<Result.Result<void, Error>>(() => {
      // 排队等锁期间任务可能已经被停止；这里再确认一次，避免"停了还弹一次"
      if (signal?.aborted) {
        return Promise.resolve(Result.fail(new AbortError()))
      }
      return Result.pipe(
        ensurePage(this.mainPage),
        Result.andThen(page => getItemFromVirtualScroller(page, elementFinder, id)),
        Result.andThen(item => elementFinder.getPopUpButtonFromGoodsItem(item)),
        Result.andThen(popupBtn =>
          toggleButton(popupBtn, TEXTS.POPUP_BUTTON, TEXTS.POPUP_BUTTON_CANCLE, signal),
        ),
      )
    })
  }

  async performComment(message: string) {
    return this.pageLock.run(() =>
      Result.pipe(
        ensurePage(this.mainPage),
        Result.andThen(page => comment(page, elementFinder, message, false)),
      ),
    )
  }

  getPopupPage() {
    return this.mainPage
  }

  getCommentPage() {
    return this.mainPage
  }

  // ==================== 营销工具：福袋 / 优惠券 ====================

  getGiftBagTemplates(): Result.ResultAsync<GiftBagTemplate[], PlatformError> {
    return this.pageLock.run(() =>
      Result.pipe(
        ensurePage(this.mainPage),
        Result.andThen(page =>
          Result.try({
            immediate: true,
            try: () => readGiftBagTemplates(page),
            catch: err => new UnexpectedError({ description: String(err) }),
          }),
        ),
      ),
    )
  }

  sendGiftBag(index: number): Result.ResultAsync<SendGiftBagResult, PlatformError> {
    return this.pageLock.run(() =>
      Result.pipe(
        ensurePage(this.mainPage),
        Result.andThen(page =>
          Result.try({
            immediate: true,
            try: () => sendGiftBagByIndex(page, index),
            catch: err => new UnexpectedError({ description: String(err) }),
          }),
        ),
      ),
    )
  }

  getCoupons(): Result.ResultAsync<CouponInfo[], PlatformError> {
    return this.pageLock.run(() =>
      Result.pipe(
        ensurePage(this.mainPage),
        Result.andThen(page =>
          Result.try({
            immediate: true,
            try: () => readCoupons(page),
            catch: err => new UnexpectedError({ description: String(err) }),
          }),
        ),
      ),
    )
  }

  sendCoupon(params: SendCouponParams): Result.ResultAsync<void, PlatformError> {
    return this.pageLock.run(() =>
      Result.pipe(
        ensurePage(this.mainPage),
        Result.andThen(page =>
          Result.try({
            immediate: true,
            try: () => sendCouponOnPage(page, params),
            catch: err => new UnexpectedError({ description: String(err) }),
          }),
        ),
      ),
    )
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
