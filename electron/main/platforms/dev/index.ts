import { Result } from '@praha/byethrow'
import type { Page } from 'playwright'
import { UnexpectedError } from '#/errors/AppError'
import { PageNotFoundError, type PlatformError } from '#/errors/PlatformError'
import { createLogger } from '#/logger'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { getRandomDouyinLiveMessage } from '#/utils'
import { comment, ensurePage, getItemFromVirtualScroller, toggleButton } from '../helper'
import type { ICommentListener, IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { devElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '测试平台' as const

export class DevPlatform implements IPlatform, IPerformComment, IPerformPopup, ICommentListener {
  readonly _isPerformPopup = true
  readonly _isPerformComment = true
  readonly _isCommentListener = true

  private listenerTimer: ReturnType<typeof setInterval> | null = null
  private mainPage: Page | null = null
  private readonly logger = createLogger('DevPlatform')
  private documentWritten = false

  startCommentListener(onComment: (comment: DouyinLiveMessage) => void) {
    const result = randomResult(
      new UnexpectedError({ description: '打开监听评论时发生的错误' }),
      0.1,
    )
    if (Result.isFailure(result)) {
      throw result.error
    }

    this.listenerTimer = setInterval(() => {
      const message = getRandomDouyinLiveMessage()
      onComment(message)
    }, 1000)
  }

  stopCommentListener(): void {
    if (this.listenerTimer) {
      clearInterval(this.listenerTimer)
      this.listenerTimer = null
    }
  }

  async performPopup(id: number, signal?: AbortSignal) {
    console.log(`-----------------讲解商品ID: ${id}`)
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => getItemFromVirtualScroller(page, elementFinder, id)),
      Result.andThen(item => elementFinder.getPopUpButtonFromGoodsItem(item)),
      Result.andThen(popupBtn => toggleButton(popupBtn, '讲解', '取消讲解', signal)),
    )
  }

  getPopupPage() {
    return ensurePage(this.mainPage)
  }

  async performComment(message: string) {
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => comment(page, elementFinder, message, false)),
    )
  }

  getCommentPage() {
    return ensurePage(this.mainPage)
  }

  get platformName() {
    return PLATFORM_NAME
  }

  getCommentListenerPage() {
    if (!this.mainPage) {
      throw new PageNotFoundError()
    }
    return this.mainPage
  }

  async connect(browserSession: BrowserSession) {
    // await _browserSession.page.close()
    // await _browserSession.page.waitForSelector('#id', { timeout: 100 })
    // const result = randomResult(new UnexpectedError({ description: '连接中控台触发的错误' }), 0.1)
    // if (Result.isFailure(result)) {
    //   throw result.error
    // }
    if (!this.documentWritten) {
      await browserSession.page.setContent((await import('./dev.html?raw')).default)
      this.documentWritten = true
    }
    const isConnect = await Promise.race([
      browserSession.page
        .waitForSelector('.top-nav')
        .then(() => true), // 中控台
      browserSession.page
        .waitForSelector('.login-form__btn-submit')
        .then(() => false), // 登录
    ])
    if (isConnect) {
      this.mainPage = browserSession.page
    }
    return isConnect
  }

  async login(browserSession: BrowserSession) {
    const { page } = browserSession
    await page.waitForSelector('.top-nav')
    // return Result.unwrap(randomResult(new UnexpectedError({ description: '登录时发生意外' })))
  }

  async getAccountName(session: BrowserSession) {
    const accountName = await session.page.$('.user-profile span').then(el => el?.textContent())
    return accountName ?? ''
  }

  async disconnect() {
    this.logger.info('disconnect')
  }
}

function randomResult(error: PlatformError, p = 0.5) {
  const randomNumber = Math.random()
  if (randomNumber <= p) {
    return Result.fail(error)
  }
  return Result.succeed()
}
