import { Result } from '@praha/byethrow'
import type { ElementHandle, Page } from 'playwright'
import { ElementDisabledError, ElementNotFoundError } from '#/errors/PlatformError'
import { commonElementFinder, type IElementFinder } from '../IElementFinder'
import { SELECTORS } from './constant'

export const kuaishouElementFinder: IElementFinder = {
  async getPopUpButtonFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    const button = await item.$(SELECTORS.goodsItem.POPUP_BUTTON)
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '弹窗按钮',
          selector: SELECTORS.goodsItem.POPUP_BUTTON,
        }),
      )
    }
    return Result.succeed(button)
  },

  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    return commonElementFinder.getIdFromGoodsItem(item, SELECTORS.goodsItem.ID)
  },

  async getCurrentGoodsItemsList(page: Page) {
    const items = await commonElementFinder.getCurrentGoodsItemsList(page, SELECTORS.GOODS_ITEM)
    if (Result.isFailure(items)) {
      return items
    }
    // 过滤掉置顶的正在弹窗商品（因为没有序号）
    // 每个 item 都有 id，过滤掉以 recording 结尾的 id（如 inner_c1goods-xxxxxxxxxx-recording）
    const filteredItems = []
    for (const item of items.value) {
      if (!(await item.getAttribute('id'))?.endsWith('recording')) {
        filteredItems.push(item)
      }
    }
    return Result.succeed(filteredItems)
  },

  async getGoodsItemsScrollContainer(page: Page) {
    return commonElementFinder.getGoodsItemsScrollContainer(page, SELECTORS.GOODS_ITEMS_WRAPPER)
  },

  getCommentTextarea(page: Page) {
    return commonElementFinder.getCommentTextarea(page, SELECTORS.commentInput.TEXTAREA)
  },

  async getClickableSubmitCommentButton(page: Page) {
    const submitButton = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!submitButton) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '提交评论按钮',
          selector: SELECTORS.commentInput.SUBMIT_BUTTON,
        }),
      )
    }
    if (await submitButton.isDisabled()) {
      return Result.fail(
        new ElementDisabledError({
          elementName: '提交评论按钮',
          element: await submitButton.evaluate(el => el.outerHTML),
        }),
      )
    }
    return Result.succeed(submitButton)
  },

  async getPinTopLabel(page: Page) {
    const pinTopLabel = await page.$(SELECTORS.commentInput.PIN_TOP_LABEL)
    if (!pinTopLabel) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '置顶选项',
          selector: SELECTORS.commentInput.PIN_TOP_LABEL,
        }),
      )
    }
    return Result.succeed(pinTopLabel)
  },
}
