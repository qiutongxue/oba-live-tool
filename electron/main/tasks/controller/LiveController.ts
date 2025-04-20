import type { ElementHandle, Page } from 'playwright'
import { LIVE_OVER_CLOSE_SELECTOR, RECOVERY_BUTTON_SELECTOR } from '#/constants'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import { abortable } from '#/utils/decorators'
import type { LiveControlElementFinder } from './LiveControlElementFinder'
import { type PopUpStrategy, getPopUpStrategy } from './PopUpStrategy'
import { BuyinLiveControlElementFinder } from './finders/BuyinLiveControlElementFinder'
import { EOSLiveControlElementFinder } from './finders/EOSLiveControlElementFinder'
import { RedbookLiveControlElementFinder } from './finders/RedbookLiveControlElementFinder'

function getLiveControlElementFinder(
  platform: LiveControlPlatform,
  page: Page,
) {
  switch (platform) {
    case 'eos':
      return new EOSLiveControlElementFinder(page)
    case 'redbook':
      return new RedbookLiveControlElementFinder(page)
    default:
      return new BuyinLiveControlElementFinder(page)
  }
}

export class LiveController {
  // protected page: Page
  // protected logger: ReturnType<typeof createLogger>
  // protected abortSignal?: AbortSignal
  protected elementFinder: LiveControlElementFinder
  protected popUpStrategy: PopUpStrategy

  constructor(
    protected page: Page,
    protected logger = createLogger('LiveController'),
    public abortSignal?: AbortSignal,
  ) {
    const platform = pageManager.getContext()?.platform
    if (!platform) {
      throw new Error('平台不存在')
    }
    this.elementFinder = getLiveControlElementFinder(platform, page)
    this.popUpStrategy = getPopUpStrategy(platform)
  }

  @abortable
  public async sendMessage(message: string, pinTop?: boolean) {
    await this.recoveryLive()
    const textarea = await this.elementFinder.getCommentTextarea()
    if (!textarea) {
      throw new Error('找不到评论框')
    }

    await textarea.fill(message)

    let successPinTop = false
    if (pinTop) {
      successPinTop = await this.clickPinTopButton()
    }

    await this.clickSubmitCommentButton()
    this.logger.success(
      `发送${successPinTop ? '「置顶」' : ''}消息: ${message}`,
    )
  }

  @abortable
  public async popUp(id: number) {
    await this.recoveryLive()
    // 不用什么 waitFor 了，直接轮询，暴力的才是最好的
    const button = await this.getPopUpButtonById(id)
    await this.popUpStrategy(button)
    this.logger.success(`商品 ${id} 讲解成功`)
  }

  public async recoveryLive() {
    const recoveryButton = await this.page.$(RECOVERY_BUTTON_SELECTOR)
    if (recoveryButton) {
      await recoveryButton.click()
    }
    const closeLiveSummary = await this.page.$(LIVE_OVER_CLOSE_SELECTOR)
    if (closeLiveSummary) {
      await closeLiveSummary.click()
    }
  }

  private async clickPopUpButton(id: number): Promise<'讲解' | '取消讲解'> {
    const button = await this.getPopUpButtonById(id)
    const buttonText = await button.textContent()
    if (buttonText !== '取消讲解' && buttonText !== '讲解') {
      throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
    }
    // await button.scrollIntoViewIfNeeded()
    await button.dispatchEvent('click')
    return buttonText
  }

  protected async getPopUpButtonById(id: number) {
    const goodsItem = await this.findGoodsItemById(id)
    const button =
      await this.elementFinder.getPopUpButtonFromGoodsItem(goodsItem)
    return button
  }

  @abortable
  private async findGoodsItemById(
    id: number,
    prevScrollTop = 0,
  ): Promise<ElementHandle<SVGElement | HTMLElement>> {
    const { element, found } = await this.getCurrentGoodsItem(id)
    if (found) {
      return element
    }
    // 往上滚到头或往下滚到头，触发列表加载
    await element.scrollIntoViewIfNeeded()

    const scrollContainer =
      await this.elementFinder.getGoodsItemsScrollContainer()
    if (!scrollContainer) {
      throw new Error('找不到滚动容器？')
    }

    // 等待 1 秒，等新的商品加载完
    await new Promise(resolve => setTimeout(resolve, 1000))
    const currentScrollTop = await scrollContainer.evaluate(el => el.scrollTop)
    // 没法滚了，说明加载完了还找不到东西
    if (
      prevScrollTop - 10 <= currentScrollTop &&
      currentScrollTop <= prevScrollTop + 10
    ) {
      throw new Error('找不到商品，请确认商品 id 是否正确')
    }
    return this.findGoodsItemById(id, currentScrollTop)
  }

  @abortable
  private async getCurrentGoodsItem(id: number) {
    const currentGoodsItems =
      await this.elementFinder.getCurrentGoodsItemsList()
    const firstGoodsItem = currentGoodsItems[0]
    if (!firstGoodsItem) {
      throw new Error('没有上架任何商品')
    }
    const firstIdValue =
      await this.elementFinder.getIdFromGoodsItem(firstGoodsItem)

    if (id < firstIdValue) {
      this.logger.warn(
        `商品 ${id} 不在当前商品的范围 [${firstIdValue} ~ ${firstIdValue + currentGoodsItems.length - 1}]，继续查找中...`,
      )
      // 需要往上滚
      return {
        element: currentGoodsItems[0],
      }
    }
    if (id >= firstIdValue + currentGoodsItems.length) {
      this.logger.warn(
        `商品 ${id} 不在当前商品的范围 [${firstIdValue} ~ ${firstIdValue + currentGoodsItems.length - 1}]，继续查找中...`,
      )
      // 需要往下滚
      return {
        element: currentGoodsItems[currentGoodsItems.length - 1],
      }
    }
    // 找到了
    return {
      element: currentGoodsItems[id - firstIdValue],
      found: true,
    }
  }

  private async clickPinTopButton() {
    const pinTopLabel = await this.elementFinder.getPinTopLabel()
    if (!pinTopLabel) {
      this.logger.warn('找不到置顶选项，不进行置顶')
      return false
    }
    await pinTopLabel.dispatchEvent('click')
    return true
  }

  private async clickSubmitCommentButton() {
    const submit_btn =
      await this.elementFinder.getClickableSubmitCommentButton()
    if (!submit_btn) {
      throw new Error('无法点击发布按钮')
    }
    await submit_btn.dispatchEvent('click')
  }
}
