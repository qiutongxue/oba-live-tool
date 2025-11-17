import { Result } from '@praha/byethrow'
import type { Page } from 'playwright'
import {
  ConnectionError,
  PageNotFoundError,
  type PlatformError,
  UnexpectedError,
} from '#/errors/PlatformError'
import { createLogger } from '#/logger'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { getRandomDouyinLiveMessage } from '#/utils'
import { ensurePage } from '../helper'
import type {
  ICommentListener,
  IPerformComment,
  IPerformPopup,
  IPlatform,
} from '../IPlatform'

const PLATFORM_NAME = '测试平台' as const

export class DevPlatform
  implements IPlatform, IPerformComment, IPerformPopup, ICommentListener
{
  readonly _isPerformPopup = true
  readonly _isPerformComment = true
  readonly _isCommentListener = true

  private listenerTimer: ReturnType<typeof setInterval> | null = null
  private mainPage: Page | null = null
  private readonly logger = createLogger('DevPlatform')

  startCommentListener(onComment: (comment: DouyinLiveMessage) => void) {
    const result = randomResult(new UnexpectedError('测试未知错误'), 0.5)
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

  async performPopup(_id: number) {
    return randomResult(new UnexpectedError('自动弹窗时发生了一个错误'))
  }

  getPopupPage() {
    return ensurePage(this.mainPage)
  }

  async performComment(_message: string, pinTop?: boolean) {
    return Result.pipe(
      randomResult(new UnexpectedError('自动评论时发生了一个错误')),
      Result.map(_ => !!pinTop),
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

  async connect(_browserSession: BrowserSession) {
    // await _browserSession.page.close()
    // await _browserSession.page.waitForSelector('#id', { timeout: 100 })
    const result = randomResult(new ConnectionError())
    if (Result.isFailure(result)) {
      throw result.error
    }

    this.mainPage = _browserSession.page
    return true
  }

  async login(_browserSession: BrowserSession) {
    return Result.unwrap(randomResult(new UnexpectedError('登录时发生意外')))
  }

  async getAccountName(_session: BrowserSession) {
    return '测试'
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
