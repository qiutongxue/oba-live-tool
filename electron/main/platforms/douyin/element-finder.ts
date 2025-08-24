import type { ElementHandle, Page } from 'playwright'
import { error } from '#/constants'
import type { IElementFinder } from '../IElementFinder'
import { SELECTORS } from './constant'

export const douyinElementFinder: IElementFinder = {
  async getPinTopLabel(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const pinTopLabel = await page.$(SELECTORS.commentInput.PIN_TOP_LABEL)
    return pinTopLabel
  },

  async getClickableSubmitCommentButton(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const submit_btn = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!submit_btn) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (
      (await submit_btn.getAttribute('class'))?.includes(
        SELECTORS.commentInput.SUBMIT_BUTTON_DISABLED,
      )
    ) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return submit_btn
  },

  async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const goodsAction = await item.$(SELECTORS.goodsItem.ACTION)
    if (!goodsAction) {
      throw new Error(error.elementFinder.ACTION_PANEL_NOT_FOUND)
    }
    // 默认获取第一个元素，就是讲解按钮所在的位置
    const button = await goodsAction.$(SELECTORS.goodsItem.POPUP_BUTTON)
    // const button = await presBtnWrap?.$('button')
    if (!button) {
      throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
    }
    return button
  },

  async getGoodsItemsScrollContainer(page: Page) {
    return page.$(SELECTORS.GOODS_ITEMS_WRAPPER)
  },

  async getCurrentGoodsItemsList(page: Page) {
    return page.$$(SELECTORS.GOODS_ITEM)
  },

  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    const idInput = await item.$(SELECTORS.goodsItem.ID)
    const id = Number.parseInt((await idInput?.inputValue()) ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  },

  async getCommentTextarea(page: Page) {
    return page.$(SELECTORS.commentInput.TEXTAREA)
  },
}
