import type { ElementHandle } from 'playwright'
import { eos as eosConst, error } from '#/constants'
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
      eosConst.selectors.commentInput.SUBMIT_BUTTON,
    )
    if (!sendMessageButton) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (
      await sendMessageButton.evaluate(el => el.className.includes('disable'))
    ) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return sendMessageButton
  }

  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLButtonElement>> {
    const button = await item.$(eosConst.selectors.goodsItem.POPUP_BUTTON)
    if (!button) {
      throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
    }
    if (await button.evaluate(el => el.className.includes('disabled'))) {
      throw new Error(error.elementFinder.PROMOTING_BTN_DISABLED)
    }
    return button as ElementHandle<HTMLButtonElement>
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const idInput = await item.$(eosConst.selectors.goodsItem.ID)
    const id = Number.parseInt((await idInput?.inputValue()) ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  }

  public async getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  > {
    return this.page.$$(eosConst.selectors.GOODS_ITEM)
  }

  public getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$(eosConst.selectors.GOODS_ITEMS_WRAPPER)
  }

  public async getCommentTextarea(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const textarea = await this.page.$(eosConst.selectors.commentInput.TEXTAREA)
    return textarea
  }
}
