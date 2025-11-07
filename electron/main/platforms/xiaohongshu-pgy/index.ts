import type { Page } from 'playwright'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { ensurePage, getAccountName } from '../helper'
import type { IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { XiaohongshuPlatform } from '../xiaohongshu'
import { REGEXPS, SELECTORS, URLS } from './constant'

const PLATFORM_NAME = '蒲公英' as const

/**
 * 蒲公英
 */
export class XiaohongshuPgyPlatform
  implements IPlatform, IPerformPopup, IPerformComment
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  private mainPage: Page | null = null

  async connect(browserSession: BrowserSession) {
    const { page } = browserSession
    // 蒲公英用不了传统方法，得先进入首页
    await page.goto(URLS.INDEX_PAGE, {
      waitUntil: 'domcontentloaded',
    })
    await Promise.race([
      page.waitForURL(REGEXPS.LOGIN_PAGE, {
        timeout: 0,
        waitUntil: 'domcontentloaded',
      }),
      page.waitForSelector(SELECTORS.ACCOUNT_NAME, {
        timeout: 0,
      }),
    ])

    const isConnected = !REGEXPS.LOGIN_PAGE.test(page.url())

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
      // 等待中控台页面加载（大概要 3~5 秒）
      await this.mainPage.waitForSelector(SELECTORS.IN_LIVE_CONTROL)
    }
    return isConnected
  }

  async login(browserSession: BrowserSession): Promise<void> {
    const { page } = browserSession
    if (!REGEXPS.LOGIN_PAGE.test(page.url())) {
      await page.goto(URLS.LOGIN_PAGE)
    }
    // 蒲公英登录可以帮用户点击登录按钮
    const loginButton = await page.waitForSelector(SELECTORS.LOGIN_BUTTON, {
      timeout: 0,
    })
    await loginButton.click()

    await page.waitForSelector(SELECTORS.LOGGED_IN, {
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

  async performPopup(id: number) {
    return await XiaohongshuPlatform.prototype.performPopup.call(this, id)
  }

  async performComment(message: string, pinTop?: boolean): Promise<boolean> {
    return await XiaohongshuPlatform.prototype.performComment.call(
      this,
      message,
      pinTop,
    )
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
