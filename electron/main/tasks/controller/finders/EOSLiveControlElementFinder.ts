import type { ElementHandle } from 'playwright'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class EOSLiveControlElementFinder extends LiveControlElementFinder {
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
