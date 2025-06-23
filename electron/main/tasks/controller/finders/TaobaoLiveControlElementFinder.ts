import type { ElementHandle, Locator } from 'playwright'
import { error, taobao } from '#/constants'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class TaobaoLiveControlElementFinder extends LiveControlElementFinder {
  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const button = await item.$(taobao.selectors.goodsItem.POPUP_BUTTON)
    if (!button) {
      throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
    }
    return button
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const idWrapper = await item.$(taobao.selectors.goodsItem.ID)
    const idText = (await idWrapper?.textContent())?.match(/\d+/)?.[0]
    const id = Number.parseInt(idText ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  }

  public async getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  > {
    const items = await this.page.$$(taobao.selectors.GOODS_ITEM)
    return items
  }

  public async getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const scrollWrapper = await this.page.$(
      taobao.selectors.GOODS_ITEMS_WRAPPER,
    )
    return scrollWrapper
  }

  public async getCommentTextarea(): Promise<
    ElementHandle<SVGElement | HTMLElement> | Locator | null
  > {
    const textarea = await this.page.$(taobao.selectors.commentInput.TEXTAREA)
    return textarea
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const button = await this.page.$(
      taobao.selectors.commentInput.SUBMIT_BUTTON,
    )
    if (!button) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (await button.isDisabled()) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return button
  }

  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  }
}
