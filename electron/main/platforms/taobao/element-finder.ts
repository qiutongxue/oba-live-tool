import { Result } from '@praha/byethrow'
import type { ElementHandle, Page } from 'playwright'
import {
  ElementContentMismatchedError,
  ElementDisabledError,
  ElementNotFoundError,
} from '#/errors/PlatformError'
import { commonElementFinder, type IElementFinder } from '../IElementFinder'
import { SELECTORS } from './constant'

export const taobaoElementFinder: IElementFinder = {
  async getPopUpButtonFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    const button = await item.$(SELECTORS.goodsItem.POPUP_BUTTON)
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '弹品按钮',
          selector: SELECTORS.goodsItem.POPUP_BUTTON,
        }),
      )
    }
    return Result.succeed(button)
  },

  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    const idWrapper = await item.$(SELECTORS.goodsItem.ID)
    if (!idWrapper) {
      // 淘宝企业和达人的商品序号位置不同，达人找不到就改成企业的
      return commonElementFinder.getIdFromGoodsItem(item, SELECTORS.goodsItem.ID_ALTER)
    }
    const idText = (await idWrapper.textContent())?.match(/\d+/)?.[0] ?? ''
    const id = Number.parseInt(idText, 10)
    if (Number.isNaN(id)) {
      return Result.fail(
        new ElementContentMismatchedError({
          current: idText,
          target: '数字',
        }),
      )
    }
    return Result.succeed(id)
  },

  async getCurrentGoodsItemsList(page: Page) {
    return commonElementFinder.getCurrentGoodsItemsList(page, SELECTORS.GOODS_ITEM)
  },

  async getGoodsItemsScrollContainer(page: Page) {
    return commonElementFinder.getGoodsItemsScrollContainer(page, SELECTORS.GOODS_ITEMS_WRAPPER)
  },

  async getCommentTextarea(page: Page) {
    return commonElementFinder.getCommentTextarea(page, SELECTORS.commentInput.TEXTAREA)
  },

  async getClickableSubmitCommentButton(page: Page) {
    const button = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '发送评论按钮',
          selector: SELECTORS.commentInput.SUBMIT_BUTTON,
        }),
      )
    }
    if (await button.isDisabled()) {
      return Result.fail(
        new ElementDisabledError({
          elementName: '发送评论按钮',
          element: await button.evaluate(el => el.outerHTML),
        }),
      )
    }
    return Result.succeed(button)
  },

  async getPinTopLabel() {
    return commonElementFinder.getEmptyPinTopLabel()
  },
}
