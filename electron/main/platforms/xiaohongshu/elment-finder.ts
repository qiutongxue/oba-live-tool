import type { ElementHandle, Page } from 'playwright'
import { error } from '#/constants'
import type { IElementFinder } from '../IElementFinder'
import { SELECTORS, TEXTS } from './constant'

export const xiaohongshuElementFinder: IElementFinder = {
  async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const pannel = await item.$(SELECTORS.GOODS_ITEM_INNER.OPERATION_PANNEL)
    if (!pannel) {
      throw new Error(error.elementFinder.ACTION_PANEL_NOT_FOUND)
    }
    const operations = await pannel.$$(
      SELECTORS.GOODS_ITEM_INNER.OPERATION_ITEM,
    )
    for (const operation of operations) {
      if ((await operation.textContent())?.includes(TEXTS.POPUP_BUTTON_TEXT)) {
        if (
          await operation.evaluate(
            (e, SELECTORS) =>
              e.classList.contains(
                SELECTORS.GOODS_ITEM_INNER.POPUP_BUTTON_DISABLED,
              ),
            SELECTORS,
          )
        ) {
          throw new Error(error.elementFinder.PROMOTING_BTN_DISABLED)
        }
        return operation
      }
    }
    throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
  },

  async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const input = await item.$(SELECTORS.GOODS_ITEM_INNER.ID)
    const id = Number.parseInt((await input?.inputValue()) ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  },

  async getCurrentGoodsItemsList(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement>[]> {
    const goodsItemsList = await page.$$(SELECTORS.GOODS_ITEM)
    return goodsItemsList
  },

  getGoodsItemsScrollContainer(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    return page.$(SELECTORS.GOODS_ITEMS_WRAPPER)
  },

  getCommentTextarea(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    return page.$(SELECTORS.COMMENT_INPUT.TEXTAREA)
  },

  async getClickableSubmitCommentButton(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const submitButton = await page.$(SELECTORS.COMMENT_INPUT.SUBMIT_BUTTON)
    if (!submitButton) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (
      await submitButton.evaluate(
        (el, SELECTORS) =>
          el.className.includes(SELECTORS.COMMENT_INPUT.SUBMIT_BUTTON_DISABLED),
        SELECTORS,
      )
    ) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return submitButton
  },

  async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  },
}
