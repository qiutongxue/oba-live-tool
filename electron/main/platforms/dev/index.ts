import type { Page } from 'playwright'
import { createLogger } from '#/logger'
import type { BrowserSession } from '#/tasks/connection/types'
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

  startCommentListener(onComment: (comment: DouyinLiveMessage) => void): void {
    randomThrowError('startCommentListener Error', 0.5)
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
    randomThrowError('自动弹窗时发生了一个错误')
  }

  getPopupPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  async performComment(_message: string, pinTop?: boolean): Promise<boolean> {
    randomThrowError('自动评论时发生了一个错误')
    return !!pinTop
  }

  getCommentPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  get platformName() {
    return PLATFORM_NAME
  }

  getCommentListenerPage(): Page {
    ensurePage(this.mainPage)
    return this.mainPage
  }

  connect(_browserSession: BrowserSession): Promise<boolean> {
    randomThrowError('连接中控台发生意外')
    this.mainPage = _browserSession.page
    return Promise.resolve(true)
  }

  login(_browserSession: BrowserSession): Promise<void> {
    randomThrowError('登录时发生意外')
    return Promise.resolve()
  }

  getAccountName(_session: BrowserSession): Promise<string> {
    return Promise.resolve('测试')
  }

  async disconnect() {
    this.logger.info('disconnect')
  }
}

function randomThrowError(msg: string, p = 0.5) {
  const randomNumber = Math.random()
  if (randomNumber <= p) {
    throw new Error(msg)
  }
}
