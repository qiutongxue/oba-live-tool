import { Result } from '@praha/byethrow'
import type { Page } from 'playwright'
import { ElementContentMismatchedError, type PlatformError } from '#/errors/PlatformError'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import {
  comment,
  ensurePage,
  getAccountName,
  getItemFromVirtualScroller,
  toggleButton,
} from '../helper'
import type {
  ICommentListener,
  IPerformComment,
  IPerformPopup,
  IPinComment,
  IPlatform,
} from '../IPlatform'
import { WeChatChannelCommentListener } from './commentListener'
import { REGEXPS, SELECTORS, TEXT, URLS } from './constant'
import { wechatChannelElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '微信视频号' as const

/**
 * 微信视频号
 */
export class WechatChannelPlatform
  implements IPlatform, IPerformPopup, IPerformComment, ICommentListener, IPinComment
{
  readonly _isPinComment = true
  readonly _isCommentListener = true
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  private mainPage: Page | null = null
  /** 商品列表页面 */
  private productsPage: Page | null = null
  private commentListener: WeChatChannelCommentListener | null = null
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

  async disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performPopup(id: number, signal?: AbortSignal) {
    return Result.pipe(
      ensurePage(this.productsPage),
      Result.andThen(page => getItemFromVirtualScroller(page, elementFinder, id)),
      Result.andThen(item => elementFinder.getPopUpButtonFromGoodsItem(item)),
      Result.andThen(btn => toggleButton(btn, TEXT.POPUP_BUTTON, TEXT.POPUP_BUTTON_CANCLE, signal)),
    )
  }

  async performComment(message: string) {
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => comment(page, elementFinder, message, false)),
    )
  }

  startCommentListener(onComment: (comment: LiveMessage) => void) {
    Result.pipe(
      ensurePage(this.mainPage),
      Result.inspect(page => {
        this.commentListener = new WeChatChannelCommentListener(page)
        this.commentListener.startCommentListener(onComment)
      }),
    )
  }

  stopCommentListener(): void {
    this.commentListener?.stopCommentListener()
  }

  async pinComment(comment: string): Result.ResultAsync<void, PlatformError> {
    const page = ensurePage(this.mainPage)
    if (Result.isFailure(page)) {
      return page
    }
    // 要先点击“新消息”按钮加载评论！
    const newCommentButton = await elementFinder.getNewCommentButton(page.value)
    if (Result.isSuccess(newCommentButton)) {
      await newCommentButton.value.click()
    }
    const els = await elementFinder.getComments(page.value)
    if (Result.isFailure(els)) {
      return els
    }
    for (const el of els.value.reverse()) {
      const text = ((await el.textContent()) ?? '').trim()
      if (comment === text) {
        // 找到匹配的评论，点击上墙按钮
        await el.click()
        const pinCommentActionItem = elementFinder.getPinCommentActionItem(page.value)
        await pinCommentActionItem.click()
        return Result.succeed()
      }
    }
    return Result.fail(
      new ElementContentMismatchedError({
        current: '未匹配任何评论',
        target: comment,
      }),
    )
  }

  getPinCommentPage(): Page | null {
    return this.mainPage
  }

  getCommentListenerPage(): Page {
    return Result.unwrap(ensurePage(this.commentListener?.getCommentListenerPage()))
  }

  getPopupPage() {
    return this.productsPage
  }

  getCommentPage() {
    return this.mainPage
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
