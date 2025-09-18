import type { ElementHandle, Page } from 'playwright'
import { error } from '#/constants'
import type { IElementFinder } from './../IElementFinder'
import { SELECTORS } from './constant'

export const douyinEosElementFinder: IElementFinder = {
  async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  },

  async getClickableSubmitCommentButton(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const sendMessageButton = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!sendMessageButton) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (
      await sendMessageButton.evaluate(el => el.className.includes('disable'))
    ) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return sendMessageButton
  },

  async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLButtonElement>> {
    const button = await item.$(SELECTORS.goodsItem.POPUP_BUTTON)
    if (!button) {
      throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
    }
    if (await button.evaluate(el => el.className.includes('disabled'))) {
      throw new Error(error.elementFinder.PROMOTING_BTN_DISABLED)
    }
    return button as ElementHandle<HTMLButtonElement>
  },

  async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const idInput = await item.$(SELECTORS.goodsItem.ID)
    const id = Number.parseInt((await idInput?.inputValue()) ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  },

  async getCurrentGoodsItemsList(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement>[]> {
    return page.$$(SELECTORS.GOODS_ITEM)
  },

  getGoodsItemsScrollContainer(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    return page.$(SELECTORS.GOODS_ITEMS_WRAPPER)
  },

  async getCommentTextarea(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const textarea = await page.$(SELECTORS.commentInput.TEXTAREA)
    return textarea
  },
}
