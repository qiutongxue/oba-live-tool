import { Result } from '@praha/byethrow'
import type { ElementHandle, Page } from 'playwright'
import { ElementDisabledError, ElementNotFoundError } from '#/errors/PlatformError'
import { sleep } from '#/utils'
import { commonElementFinder, type IElementFinder } from './../IElementFinder'
import { SELECTORS } from './constant'

export const douyinEosElementFinder: IElementFinder = {
  async getPinTopLabel() {
    return commonElementFinder.getEmptyPinTopLabel()
  },

  async getClickableSubmitCommentButton(page: Page) {
    // ⚠️ 同样不要用 page.$() 瞬时查询：发送按钮在重渲染瞬间会短暂缺失，
    // 而且刚 fill 完输入框时按钮可能还差一拍才从 disable 变成可用。
    const sendMessageButton = await page
      .waitForSelector(SELECTORS.commentInput.SUBMIT_BUTTON, { timeout: 5000, state: 'visible' })
      .catch(() => null)
    if (!sendMessageButton) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '发送评论按钮',
          selector: SELECTORS.commentInput.SUBMIT_BUTTON,
        }),
      )
    }

    // 最多再等 3 秒等它变可用（输入框有内容后才启用）
    const deadline = Date.now() + 3000
    while (await sendMessageButton.evaluate(el => el.className.includes('disable'))) {
      if (Date.now() >= deadline) {
        return Result.fail(
          new ElementDisabledError({
            elementName: '发送评论按钮',
            element: await sendMessageButton.evaluate(el => el.outerHTML),
          }),
        )
      }
      await sleep(200)
    }
    return Result.succeed(sendMessageButton)
  },

  async getPopUpButtonFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    const button = await item.$(SELECTORS.goodsItem.POPUP_BUTTON)
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '讲解按钮',
          selector: SELECTORS.goodsItem.POPUP_BUTTON,
        }),
      )
    }
    if (await button.evaluate(el => el.className.includes('disabled'))) {
      return Result.fail(
        new ElementDisabledError({
          elementName: '讲解按钮',
          element: await button.evaluate(el => el.outerHTML),
        }),
      )
    }
    return Result.succeed(button as ElementHandle<HTMLButtonElement>)
  },

  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    return commonElementFinder.getIdFromGoodsItem(item, SELECTORS.goodsItem.ID)
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
}
