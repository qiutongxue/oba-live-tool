import { Result } from '@praha/byethrow'
import type { ElementHandle, Page } from 'playwright'
import {
  ElementDisabledError,
  ElementNotFoundError,
} from '#/errors/PlatformError'
import { commonElementFinder, type IElementFinder } from '../IElementFinder'
import { SELECTORS, TEXTS } from './constant'

export const xiaohongshuElementFinder: IElementFinder = {
  async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const pannel = await item.$(SELECTORS.GOODS_ITEM_INNER.OPERATION_PANNEL)
    if (!pannel) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '操作面板',
          selector: SELECTORS.GOODS_ITEM_INNER.OPERATION_PANNEL,
        }),
      )
    }
    const operations = await pannel.$$(
      SELECTORS.GOODS_ITEM_INNER.OPERATION_ITEM,
    )
    for (const operation of operations) {
      if ((await operation.textContent())?.includes(TEXTS.POPUP_BUTTON)) {
        if (
          await operation.evaluate(
            (e, SELECTORS) =>
              e.classList.contains(
                SELECTORS.GOODS_ITEM_INNER.POPUP_BUTTON_DISABLED,
              ),
            SELECTORS,
          )
        ) {
          return Result.fail(
            new ElementDisabledError({
              elementName: '讲解',
              element: await operation.evaluate(el => el.outerHTML),
            }),
          )
        }
        return Result.succeed(operation)
      }
    }
    return Result.fail(
      new ElementNotFoundError({
        elementName: '讲解按钮',
      }),
    )
  },

  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    return commonElementFinder.getIdFromGoodsItem(
      item,
      SELECTORS.GOODS_ITEM_INNER.ID,
    )
  },

  async getCurrentGoodsItemsList(page: Page) {
    return commonElementFinder.getCurrentGoodsItemsList(
      page,
      SELECTORS.GOODS_ITEM,
    )
  },

  getGoodsItemsScrollContainer(page: Page) {
    return commonElementFinder.getGoodsItemsScrollContainer(
      page,
      SELECTORS.GOODS_ITEMS_WRAPPER,
    )
  },

  getCommentTextarea(page: Page) {
    return commonElementFinder.getCommentTextarea(
      page,
      SELECTORS.COMMENT_INPUT.TEXTAREA,
    )
  },

  async getClickableSubmitCommentButton(page: Page) {
    const submitButton = await page.$(SELECTORS.COMMENT_INPUT.SUBMIT_BUTTON)
    if (!submitButton) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '发送评论按钮',
          selector: SELECTORS.COMMENT_INPUT.SUBMIT_BUTTON,
        }),
      )
    }
    if (
      await submitButton.evaluate(
        (el, SELECTORS) =>
          el.className.includes(SELECTORS.COMMENT_INPUT.SUBMIT_BUTTON_DISABLED),
        SELECTORS,
      )
    ) {
      return Result.fail(
        new ElementDisabledError({
          elementName: '发送评论按钮',
          element: await submitButton.evaluate(el => el.outerHTML),
        }),
      )
    }
    return Result.succeed(submitButton)
  },

  async getPinTopLabel() {
    return commonElementFinder.getEmptyPinTopLabel()
  },
}
