import { Result } from '@praha/byethrow'
import type { Page } from 'playwright'
import { ElementContentMismatchedError, PageNotFoundError } from '#/errors/PlatformError'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { sleep } from '#/utils'
import { comment, connect, ensurePage, getAccountName, getItemFromVirtualScroller } from '../helper'
import type { IPerformComment, IPerformPopup, IPlatform } from '../IPlatform'
import { REGEXPS, SELECTORS, URLS } from './constant'
import { kuaishouElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '快手小店' as const

export class KuaishouPlatform implements IPlatform, IPerformPopup, IPerformComment {
  readonly _isPerformPopup = true
  readonly _isPerformComment = true
  private mainPage: Page | null = null

  async connect(browserSession: BrowserSession): Promise<boolean> {
    const { page } = browserSession
    const isConnected = await connect(page, {
      isInLiveControlSelector: SELECTORS.IN_LIVE_CONTROL,
      liveControlUrl: URLS.LIVE_CONTROL,
      loginUrlRegex: REGEXPS.LOGIN_PAGE,
    })

    if (isConnected) {
      // 快手小店会弹出莫名其妙的窗口，按 ESC 关闭
      let popover = await page
        .waitForSelector(SELECTORS.DRIVER_POPOVER, { timeout: 5000 })
        .catch(_ => null)
      while (popover) {
        await page.press('body', 'Escape')
        await sleep(1000)
        popover = await page.$(SELECTORS.DRIVER_POPOVER)
      }
      this.mainPage = page
    }

    return isConnected
  }

  async login(browserSession: BrowserSession): Promise<void> {
    if (!REGEXPS.LOGIN_PAGE.test(browserSession.page.url())) {
      await browserSession.page.goto(URLS.LOGIN_PAGE)
    }
    await browserSession.page.waitForSelector(SELECTORS.LOGGED_IN, {
      timeout: 0,
    })
  }

  async getAccountName(session: BrowserSession): Promise<string> {
    const accountName = await getAccountName(session.page, SELECTORS.ACCOUNT_NAME)
    return accountName ?? ''
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async performComment(message: string, pinTop?: boolean) {
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => comment(page, elementFinder, message, pinTop)),
    )
  }

  getCommentPage() {
    return this.mainPage
  }

  async performPopup(id: number) {
    if (!this.mainPage) {
      return Result.fail(new PageNotFoundError())
    }
    const item = await getItemFromVirtualScroller(this.mainPage, elementFinder, id)
    if (Result.isFailure(item)) {
      return item
    }
    const button = await elementFinder.getPopUpButtonFromGoodsItem(item.value)
    if (Result.isFailure(button)) {
      return button
    }
    const buttonText = (await button.value.textContent())?.trim() ?? ''
    if (buttonText !== '结束讲解' && buttonText !== '开始讲解') {
      return Result.fail(
        new ElementContentMismatchedError({
          current: buttonText,
          target: '结束讲解或开始讲解',
        }),
      )
    }
    await button.value.dispatchEvent('click')
    // 判断是否会出现 modal
    const modalNextButton = await this.mainPage
      .waitForSelector(SELECTORS.goodsItem.POPUP_CONFIRM_BUTTON, {
        timeout: 500,
      })
      .catch(() => null)
    // 出现了就点击“确定”
    if (modalNextButton) {
      await modalNextButton.dispatchEvent('click')
    }

    // 结束讲解 - 需要再次开始讲解
    if (buttonText === '结束讲解') {
      // 为了以防万一等待一段时间
      await sleep(100)
      // 注意：此时无法使用原先的按钮，需要重新查找
      const newButton = await elementFinder.getPopUpButtonFromGoodsItem(item.value)
      if (Result.isFailure(newButton)) {
        return newButton
      }
      const newButtonText = (await newButton.value.textContent())?.trim() ?? ''
      if (newButtonText !== '开始讲解') {
        return Result.fail(
          new ElementContentMismatchedError({
            current: newButtonText,
            target: '开始讲解',
          }),
        )
      }
      newButton.value.dispatchEvent('click')
    }
    return Result.succeed()
  }

  getPopupPage() {
    return this.mainPage
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
