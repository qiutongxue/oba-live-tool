import type { Page } from 'playwright'
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

const logger = createLogger('LiveController')

export class LiveController {
  protected page: Page

  constructor(page: Page) {
    this.page = page
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
    logger.success(`发送${pinTop ? '「置顶」' : ''}消息: ${message}`)
  }

  public async popUp(id: number) {
    await this.recoveryLive()
    // 不用什么 waitFor 了，直接轮询，暴力的才是最好的
    while ((await this.clickPopUpButton(id)) === '取消讲解') {
      logger.info(`商品 ${id} 取消讲解`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    logger.success(`商品 ${id} 讲解成功`)
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

  protected async clickPopUpButton(id: number): Promise<'讲解' | '取消讲解'> {
    const goodsItem = (await this.page.$$(GOODS_ITEM_SELECTOR))?.[id - 1]

    if (!goodsItem) {
      throw new Error(`商品 ${id} 不存在`)
    }
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
    const buttonText = await button.textContent()
    if (buttonText !== '取消讲解' && buttonText !== '讲解') {
      throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
    }
    await button.click()
    return buttonText
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

export class LocalLiveController  extends LiveController {
  
  constructor(page: Page) {
    super(page)
  }

  protected async clickPopUpButton(id: number) : Promise<'讲解' | '取消讲解'> {
    const popUpButtons = await this.page.$$(`[class^="talking-btn"]`)
    if (!popUpButtons || popUpButtons.length === 0) {
      throw new Error('找不到讲解按钮，可能未上架商品')
    }
    const targetButton = popUpButtons[id - 1]
    if (!targetButton) {
      throw new Error(`商品 ${id} 不存在`)
    }
    if (await targetButton.evaluate(el => el.className.includes('disabled'))) {
      throw new Error(`无法点击「讲解」按钮，因为未开播`)
    }
    const buttonText = await targetButton?.textContent()
    if (buttonText !== '讲解' && buttonText !== '取消讲解') {
      throw new Error(`不是讲解按钮，是 ${buttonText} 按钮`)
    }
    await targetButton?.click()
    return buttonText
  }
}
