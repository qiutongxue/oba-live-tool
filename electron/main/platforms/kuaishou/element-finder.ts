import type { ElementHandle, Locator, Page } from 'playwright'
import { error } from '#/constants'
import type { IElementFinder } from '../IElementFinder'
import { SELECTORS } from './constant'

export const kuaishouElementFinder: IElementFinder = {
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
    const idInput = await item.$(SELECTORS.goodsItem.ID)
    const idInputValue = await idInput?.inputValue()
    const id = Number.parseInt(idInputValue ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  },

  async getCurrentGoodsItemsList(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement>[]> {
    const items = await page.$$(SELECTORS.GOODS_ITEM)
    // 过滤掉置顶的正在弹窗商品（因为没有序号）
    // 每个 item 都有 id，过滤掉以 recording 结尾的 id（如 inner_c1goods-xxxxxxxxxx-recording）
    const filteredItems = []
    for (const item of items) {
      if (!(await item.getAttribute('id'))?.endsWith('recording')) {
        filteredItems.push(item)
      }
    }
    return filteredItems
  },

  async getGoodsItemsScrollContainer(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    return page.$(SELECTORS.GOODS_ITEMS_WRAPPER)
  },

  getCommentTextarea(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | Locator | null> {
    return page.$(SELECTORS.commentInput.TEXTAREA)
  },

  async getClickableSubmitCommentButton(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const submitButton = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!submitButton) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (await submitButton.isDisabled()) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return submitButton
  },

  getPinTopLabel(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    return page.$(SELECTORS.commentInput.PIN_TOP_LABEL)
  },
}
