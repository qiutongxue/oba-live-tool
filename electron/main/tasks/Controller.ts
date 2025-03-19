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

export class LiveController {
  protected page: Page
  protected logger: ReturnType<typeof createLogger>

  constructor(page: Page, logger?: ReturnType<typeof createLogger>) {
    this.page = page
    this.logger = logger ?? createLogger('LiveController')
  }

  public async sendMessage(message: string, pinTop?: boolean) {
    await this.recoveryLive()
    const textarea = await this.page.$(COMMENT_TEXTAREA_SELECTOR)
    if (!textarea) {
      throw new Error('找不到评论框')
    }

    await textarea.fill(message)
    if (pinTop) {
      await this.clickPinTopButton()
    }
    await this.clickSubmitCommentButton()
    this.logger.success(`发送${pinTop ? '「置顶」' : ''}消息: ${message}`)
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
    const button = await this.getPopUpButton(id)
    const buttonText = await button.textContent()
    if (buttonText !== '取消讲解' && buttonText !== '讲解') {
      throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
    }
    await button.click()
    return buttonText
  }

  protected async getPopUpButton(id: number) {
    const goodsItem = await this.findGoodsItemById(id)
    const goodsAction = await goodsItem.$(GOODS_ACTION_SELECTOR)
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
    const scrollContainer = await this.getGoodsItemsScrollContainer()
    if (!scrollContainer) {
      throw new Error('找不到滚动容器？ Amazing!')
    }
    // TODO: 是不是要等待一会？等新的商品加载完？
    await new Promise(resolve => setTimeout(resolve, 1000))
    const currentScrollTop = await scrollContainer.evaluate(el => el.scrollTop)
    // 没法滚了，说明加载完了还找不到东西
    if (currentScrollTop === prevScrollTop) {
      throw new Error('找不到商品，请确认商品 id 是否正确')
    }
    return this.findGoodsItemById(id, currentScrollTop)
  }

  private async getCurrentGoodsItem(id: number) {
    const currentGoodsItems = await this.page.$$(GOODS_ITEM_SELECTOR)
    const firstGoodsItem = currentGoodsItems[0]
    if (!firstGoodsItem) {
      throw new Error('没有上架任何商品')
    }
    const firstIdInput = await firstGoodsItem.$(
      `div[class^="indexWrapper"] input`,
    )
    const firstIdValue = Number.parseInt(
      (await firstIdInput?.evaluate(el => (el as HTMLInputElement).value)) ??
        '',
    )
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

  protected async getGoodsItemsScrollContainer() {
    return this.page.$('#live-control-goods-list-container div')
  }

  private async clickPinTopButton() {
    const pinTopLabel = await this.page.$(PIN_TOP_SELECTOR)
    if (!pinTopLabel) {
      throw new Error('找不到置顶按钮')
    }
    await pinTopLabel.click()
  }

  private async clickSubmitCommentButton() {
    const submit_btn = await this.page.$(SUBMIT_COMMENT_SELECTOR)
    if (
      !submit_btn ||
      (await submit_btn.getAttribute('class'))?.includes('isDisabled')
    ) {
      throw new Error('无法点击发布按钮')
    }
    await submit_btn.click()
  }
}

export class LocalLiveController extends LiveController {
  protected async getPopUpButton(id: number) {
    const popUpButtons = await this.page.$$(`[class^="talking-btn"]`)
    if (!popUpButtons || popUpButtons.length === 0) {
      throw new Error('找不到讲解按钮，可能未上架商品')
    }
    const targetButton = popUpButtons[id - 1]
    if (!targetButton) {
      throw new Error(`商品 ${id} 不存在`)
    }
    if (await targetButton.evaluate(el => el.className.includes('disabled'))) {
      throw new Error('无法点击「讲解」按钮，因为未开播')
    }
    return targetButton as ElementHandle<HTMLButtonElement>
  }

  public async sendMessage(message: string, pinTop?: boolean) {
    await this.recoveryLive()
    const textarea = await this.page.$('textarea[class^="input"]')
    if (!textarea) {
      throw new Error('找不到评论框')
    }

    await textarea.fill(message)
    await this.clickSendMessageButton()
    this.logger.success(`发送消息: ${message}`)
  }

  private async clickSendMessageButton() {
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
    await sendMessageButton.click()
  }
}
