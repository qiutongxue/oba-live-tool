import { Result } from '@praha/byethrow'
import type { ElementHandle, Page } from 'playwright'
import {
  ElementDisabledError,
  ElementNotFoundError,
} from '#/errors/PlatformError'
import { commonElementFinder, type IElementFinder } from '../IElementFinder'
import { SELECTORS, TEXTS } from './constant'

export const douyinElementFinder: IElementFinder = {
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

  async getClickableSubmitCommentButton(page: Page) {
    const submit_btn = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!submit_btn) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '提交评论按钮',
          selector: SELECTORS.commentInput.SUBMIT_BUTTON,
        }),
      )
    }
    if (
      (await submit_btn.getAttribute('class'))?.includes(
        SELECTORS.commentInput.SUBMIT_BUTTON_DISABLED,
      )
    ) {
      return Result.fail(
        new ElementDisabledError({
          elementName: '提交评论按钮',
          element: await submit_btn.evaluate(el => el.outerHTML),
        }),
      )
    }
    return Result.succeed(submit_btn)
  },

  async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const goodsAction = await item.$(SELECTORS.goodsItem.ACTION)
    if (!goodsAction) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '商品操作面板',
          selector: SELECTORS.goodsItem.ACTION,
        }),
      )
    }
    // 2025.11.5 目前第一个按钮被替换成了【更多】，换成获取文本包含“讲解”的按钮
    let button = null
    for (const btn of await goodsAction.$$(SELECTORS.goodsItem.POPUP_BUTTON)) {
      if ((await btn.textContent())?.includes(TEXTS.POPUP_BUTTON)) {
        button = btn
        break
      }
    }
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '讲解按钮',
          selector: SELECTORS.goodsItem.POPUP_BUTTON,
        }),
      )
    }
    return Result.succeed(button)
  },

  async getGoodsItemsScrollContainer(page: Page) {
    return commonElementFinder.getGoodsItemsScrollContainer(
      page,
      SELECTORS.GOODS_ITEMS_WRAPPER,
    )
  },

  async getCurrentGoodsItemsList(page: Page) {
    return commonElementFinder.getCurrentGoodsItemsList(
      page,
      SELECTORS.GOODS_ITEM,
    )
  },

  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    return commonElementFinder.getIdFromGoodsItem(item, SELECTORS.goodsItem.ID)
  },

  async getCommentTextarea(page: Page) {
    return commonElementFinder.getCommentTextarea(
      page,
      SELECTORS.commentInput.TEXTAREA,
    )
  },
}
