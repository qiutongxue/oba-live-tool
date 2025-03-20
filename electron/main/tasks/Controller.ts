import type { ElementHandle, Page } from 'playwright'
import {
  COMMENT_TEXTAREA_SELECTOR,
  GOODS_ACTION_SELECTOR,
  GOODS_ITEM_SELECTOR,
  LIVE_OVER_CLOSE_SELECTOR,
  PIN_TOP_SELECTOR,
  RECOVERY_BUTTON_SELECTOR,
  SUBMIT_COMMENT_SELECTOR,
} from '#/constants'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'

export class LiveController {
  protected page: Page
  protected logger: ReturnType<typeof createLogger>
  protected elementFinder: LiveControlElementFinder

  constructor(page: Page, logger?: ReturnType<typeof createLogger>) {
    this.page = page
    this.logger = logger ?? createLogger('LiveController')
    const platform = pageManager.getContext()?.platform
    if (platform === 'eos') {
      this.elementFinder = new EOSLiveControlElementFinder(page)
    } else {
      this.elementFinder = new BuyinLiveControlElementFinder(page)
    }
  }

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

  public async popUp(id: number) {
    await this.recoveryLive()
    // 不用什么 waitFor 了，直接轮询，暴力的才是最好的
    while ((await this.clickPopUpButton(id)) === '取消讲解') {
      this.logger.info(`商品 ${id} 取消讲解`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
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

abstract class LiveControlElementFinder {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  public abstract getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLButtonElement>>
  public abstract getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number>
  public abstract getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  >
  public abstract getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
  public abstract getCommentTextarea(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
  public abstract getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
  public abstract getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
}

class BuyinLiveControlElementFinder extends LiveControlElementFinder {
  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const pinTopLabel = await this.page.$(PIN_TOP_SELECTOR)
    return pinTopLabel
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const submit_btn = await this.page.$(SUBMIT_COMMENT_SELECTOR)
    if (
      !submit_btn ||
      (await submit_btn.getAttribute('class'))?.includes('isDisabled')
    ) {
      throw new Error('无法点击发布按钮')
    }
    return submit_btn
  }

  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLButtonElement>> {
    const goodsAction = await item.$(GOODS_ACTION_SELECTOR)
    if (!goodsAction) {
      throw new Error('找不到商品操作按钮')
    }
    // 默认获取第一个元素，就是讲解按钮所在的位置
    const presBtnWrap = await goodsAction.$(`div[class*="wrapper"]:has(button)`)
    const button = await presBtnWrap?.$('button')
    if (!button) {
      throw new Error('找不到讲解按钮')
    }
    return button
  }

  public async getGoodsItemsScrollContainer() {
    return this.page.$('#live-control-goods-list-container div')
  }

  public async getCurrentGoodsItemsList() {
    return this.page.$$(GOODS_ITEM_SELECTOR)
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const idInput = await item.$(`div[class^="indexWrapper"] input`)
    return Number.parseInt(
      (await idInput?.evaluate(el => (el as HTMLInputElement).value)) ?? '',
    )
  }

  public async getCommentTextarea() {
    return this.page.$(COMMENT_TEXTAREA_SELECTOR)
  }
}

class EOSLiveControlElementFinder extends LiveControlElementFinder {
  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const sendMessageButton = await this.page.$(
      'div[class^="comment-wrap"] div[class^="button"]',
    )
    if (!sendMessageButton) {
      throw new Error('找不到发送按钮')
    }
    if (
      await sendMessageButton.evaluate(el => el.className.includes('disable'))
    ) {
      throw new Error('无法点击发送按钮，可能未输入文字')
    }
    return sendMessageButton
  }

  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLButtonElement>> {
    const button = await item.$('[class^="talking-btn"]')
    if (!button) {
      throw new Error('找不到讲解按钮')
    }
    if (await button.evaluate(el => el.className.includes('disabled'))) {
      throw new Error('无法点击「讲解」按钮，因为未开播')
    }
    return button as ElementHandle<HTMLButtonElement>
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const idInput = await item.$('input')
    return Number.parseInt((await idInput?.evaluate(el => el.value)) ?? '')
  }

  public async getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  > {
    return this.page.$$('#live-card-list div[class^="render-item"]')
  }

  public getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$('#live-card-list > div > div')
  }

  public async getCommentTextarea(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const textarea = await this.page.$('textarea[class^="input"]')
    return textarea
  }
}
