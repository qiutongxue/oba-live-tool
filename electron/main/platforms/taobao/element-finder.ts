import type { ElementHandle, Locator, Page } from 'playwright'
import { error } from '#/constants'
import type { IElementFinder } from '../IElementFinder'
import { SELECTORS } from './constant'

export const taobaoElementFinder: IElementFinder = {
  async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const button = await item.$(SELECTORS.goodsItem.POPUP_BUTTON)
    if (!button) {
      throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
    }
    return button
  },

  async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const idWrapper = await item.$(SELECTORS.goodsItem.ID)
    const idText = (await idWrapper?.textContent())?.match(/\d+/)?.[0]
    const id = Number.parseInt(idText ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  },

  async getCurrentGoodsItemsList(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement>[]> {
    const items = await page.$$(SELECTORS.GOODS_ITEM)
    return items
  },

  async getGoodsItemsScrollContainer(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const scrollWrapper = await page.$(SELECTORS.GOODS_ITEMS_WRAPPER)
    return scrollWrapper
  },

  async getCommentTextarea(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | Locator | null> {
    const textarea = await page.$(SELECTORS.commentInput.TEXTAREA)
    return textarea
  },

  async getClickableSubmitCommentButton(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const button = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!button) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (await button.isDisabled()) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return button
  },

  async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  },
}
