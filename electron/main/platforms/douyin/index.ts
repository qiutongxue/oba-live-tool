import { Result } from '@praha/byethrow'
import type { Page } from 'playwright'
import type { BrowserSession } from '#/managers/BrowserSessionManager'
import { UnexpectedError } from '#/errors/AppError'
import { ElementNotFoundError, type PlatformError } from '#/errors/PlatformError'
import { sleep } from '#/utils'
import {
  comment,
  connect,
  ensurePage,
  getAccountName,
  getItemFromVirtualScroller,
  openUrlByElement,
  toggleButton,
} from '../helper'
import type {
  ICommentListener,
  IPerformComment,
  IPerformPopup,
  IPlatform,
  ISendRedPacket,
} from '../IPlatform'
import { CompassListener, ControlListener } from './commentListener'
import { REGEXPS, SELECTORS, TEXTS, URLS } from './constant'
import { douyinElementFinder as elementFinder } from './element-finder'

const PLATFORM_NAME = '抖音小店' as const

/**
 * 抖音小店
 */
export class DouyinPlatform
  implements IPlatform, IPerformPopup, IPerformComment, ICommentListener, ISendRedPacket
{
  readonly _isPerformComment = true
  readonly _isPerformPopup = true
  readonly _isCommentListener = true
  readonly _isSendRedPacket = true

  public mainPage: Page | null = null
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
    const newPage = await openUrlByElement(browserSession.page, URLS.LOGIN_PAGE)
    await browserSession.page.close()
    browserSession.page = newPage

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
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => getItemFromVirtualScroller(page, elementFinder, id)),
      Result.andThen(item => elementFinder.getPopUpButtonFromGoodsItem(item)),
      Result.andThen(popupBtn =>
        toggleButton(popupBtn, TEXTS.POPUP_BUTTON, TEXTS.POPUP_BUTTON_CANCLE, signal),
      ),
    )
  }

  async performComment(message: string, pinTop: boolean) {
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => comment(page, elementFinder, message, pinTop)),
    )
  }

  getPopupPage() {
    return this.mainPage
  }

  getCommentPage() {
    return this.mainPage
  }

  startCommentListener(onComment: (comment: LiveMessage) => void, source: 'control' | 'compass') {
    Result.pipe(
      ensurePage(this.mainPage),
      Result.map(page => {
        if (source === 'control') {
          this.commentListener = new ControlListener(page)
        } else {
          this.commentListener = new CompassListener('douyin', page)
        }
        return this.commentListener.startCommentListener(onComment, source)
      }),
      Result.unwrap(),
    )
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

  async sendRedPacket(duration: string, signal?: AbortSignal): Result.ResultAsync<void, PlatformError> {
    return Result.pipe(
      ensurePage(this.mainPage),
      Result.andThen(page => this.performSendRedPacket(page, duration, signal)),
    )
  }

  private async performSendRedPacket(
    page: Page,
    duration: string,
    _signal?: AbortSignal,
  ): Result.ResultAsync<void, PlatformError> {
    return Result.try({
      immediate: true,
      try: async () => {
        // 1. 点击中控台的"发红包"按钮
        const redPacketBtn = await page.waitForSelector(
          'button:has-text("发红包"), div[class*="redPacket"], [data-e2e="red-packet-btn"], :text("发红包")',
          { timeout: 5000 },
        )
        if (!redPacketBtn)
          throw new ElementNotFoundError({ elementName: '发红包按钮' })
        await redPacketBtn.click()
        await sleep(1500)

        // 2. 在弹出的页面/弹窗中选择"店铺红包"标签
        const shopTab = await page.waitForSelector(
          ':text("店铺红包"), div[role="tab"]:has-text("店铺红包"), span:has-text("店铺红包")',
          { timeout: 5000 },
        )
        if (!shopTab)
          throw new ElementNotFoundError({ elementName: '店铺红包标签' })
        await shopTab.click()
        await sleep(1500)

        // 3. 如果有"生效中"的红包，找到同行的"作废"按钮点击
        // 表格行是 tr.auxo-table-row，按钮是 button.auxo-btn-link
        const activeRows = await page.$$('tr.auxo-table-row:has-text("生效中")')
        for (const row of activeRows) {
          // 确认此行确实有"生效中"状态（而非"未生效"被误匹配）
          const statusText = await row.textContent()
          if (!statusText?.includes('生效中') || statusText?.indexOf('未生效') !== -1) continue
          const voidBtn = await row.$('button:has-text("作废")')
          if (!voidBtn) continue
          await voidBtn.click()
          await sleep(1000)
          // 作废确认弹窗，按钮文字是"作废"
          const voidConfirm = await page.waitForSelector(
            'button.auxo-btn-primary:has-text("作废"), button.auxo-btn-danger:has-text("作废")',
            { timeout: 5000 },
          )
          if (voidConfirm) {
            await voidConfirm.click()
            await sleep(1500)
          }
        }

        // 4. 找到第一个"未生效"红包行，点击其"投放"按钮
        const inactiveRow = await page.waitForSelector(
          'tr.auxo-table-row:has-text("未生效")',
          { timeout: 5000 },
        )
        if (!inactiveRow)
          throw new ElementNotFoundError({ elementName: '未生效红包' })
        const deployBtn = await inactiveRow.$('button:has-text("投放")')
        if (!deployBtn)
          throw new ElementNotFoundError({ elementName: '投放按钮' })
        await deployBtn.click()
        await sleep(1500)

        // 5. 在投放设置弹窗中，找到"限时领取"那个下拉框（当前值是"10分钟"）
        // 弹窗内有2个 select：第1个是"设置后 5 推荐"，第2个是"限时领取 10分钟"
        // 精确定位：找包含 span[title="10分钟"] 的那个 select
        const dropdown = await page.waitForSelector(
          'div.auxo-select:has(span[title="10分钟"]) .auxo-select-selector',
          { timeout: 5000 },
        ).catch(() => null)
          // 回退：通过 evaluate 找弹窗内第二个 select-selector
          ?? await page.evaluateHandle(() => {
            const modal = document.querySelector('.auxo-modal-body')
            if (!modal) return null
            const selectors = modal.querySelectorAll('.auxo-select-selector')
            return selectors.length >= 2 ? selectors[selectors.length - 1] : selectors[0] ?? null
          }).then(h => h.asElement()).catch(() => null)
        if (!dropdown)
          throw new ElementNotFoundError({ elementName: '限时领取下拉框' })
        await dropdown.click()
        await sleep(1000)

        // 6. 在下拉列表中选择指定的限时领取时长
        // 下拉选项渲染在 body 层的 .auxo-select-dropdown 中
        const durationOption = await page.waitForSelector(
          `div.auxo-select-item-option[title="${duration}"]`,
          { timeout: 5000 },
        ).catch(() => null)
          ?? await page.waitForSelector(
            `div.auxo-select-item[label="${duration}"]`,
            { timeout: 3000 },
          ).catch(() => null)
        if (!durationOption)
          throw new ElementNotFoundError({ elementName: `${duration}选项` })
        await durationOption.click()
        await sleep(500)

        // 7. 点击确定按钮
        const confirmBtn = await page.waitForSelector(
          'div.auxo-modal-footer button.auxo-btn-primary:has-text("确定"), button.auxo-btn-primary:has-text("确定")',
          { timeout: 5000 },
        )
        if (!confirmBtn)
          throw new ElementNotFoundError({ elementName: '确定按钮' })
        await confirmBtn.click()
        await sleep(500)
      },
      catch: err =>
        err instanceof ElementNotFoundError
          ? err
          : new UnexpectedError({ description: String(err) }),
    })
  }

  getRedPacketPage() {
    return this.mainPage
  }

  get platformName() {
    return PLATFORM_NAME
  }
}
