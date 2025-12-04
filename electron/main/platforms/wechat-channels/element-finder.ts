import { Result } from '@praha/byethrow'
import type { ElementHandle, Locator, Page } from 'playwright'
import {
  ElementDisabledError,
  ElementNotFoundError,
  type PlatformError,
} from '#/errors/PlatformError'
import { commonElementFinder, type IElementFinder } from '../IElementFinder'
import { SELECTORS } from './constant'

type WechatChannelElementFinder = IElementFinder & {
  getNewCommentButton(page: Page): Result.ResultAsync<Locator, PlatformError>
  getComments(page: Page): Result.ResultAsync<Locator[], PlatformError>
  getPinCommentActionItem(page: Page): Locator
}

export const wechatChannelElementFinder: WechatChannelElementFinder = {
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
    return Result.succeed(button)
  },

  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    // 注：视频号的商品 ID 通过 textContent 获取，其余平台是 InputValue
    return commonElementFinder.getIdFromGoodsItem(item, SELECTORS.goodsItem.ID, true)
  },

  async getCurrentGoodsItemsList(page: Page) {
    const itemsList = await commonElementFinder.getCurrentGoodsItemsList(page, SELECTORS.GOODS_ITEM)
    if (Result.isFailure(itemsList)) {
      return itemsList
    }
    if (itemsList.value.length <= 1) {
      return Result.succeed(itemsList.value)
    }
    return Result.pipe(
      Result.sequence([
        this.getIdFromGoodsItem(itemsList.value[0]),
        this.getIdFromGoodsItem(itemsList.value[itemsList.value.length - 1]),
      ]),
      Result.andThen(([firstIdValue, lastIdValue]) => {
        // 视频号可能是倒序的，需要转成正序
        if (firstIdValue > lastIdValue) {
          itemsList.value.reverse()
        }
        // 暂时不用担心倒序可能会对后面的滚动查找元素有影响，因为视频号似乎没有虚拟列表，能把所有商品全部加载进来
        return Result.succeed(itemsList.value)
      }),
    )
  },

  async getGoodsItemsScrollContainer() {
    // 视频号没有虚拟列表，且直接遍历所有元素，按理说不会触发这个函数
    return Result.fail(new ElementNotFoundError({ elementName: '商品列表' }))
  },

  async getCommentTextarea(page: Page) {
    const iframe = page.locator(SELECTORS.LIVE_CONTROL_IFRAME)
    const textarea = iframe.locator(SELECTORS.commentInput.TEXTAREA)
    return Result.succeed(textarea)
  },

  async getClickableSubmitCommentButton(page: Page) {
    const button = await page.$(SELECTORS.commentInput.SUBMIT_BUTTON)
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '发送按钮',
          selector: SELECTORS.commentInput.SUBMIT_BUTTON,
        }),
      )
    }
    if (
      (await button.getAttribute('class'))?.includes(SELECTORS.commentInput.SUBMIT_BUTTON_DISABLED)
    ) {
      return Result.fail(
        new ElementDisabledError({
          elementName: '发送按钮',
          element: await button.evaluate(el => el.outerHTML),
        }),
      )
    }
    return Result.succeed(button)
  },

  async getPinTopLabel() {
    return commonElementFinder.getEmptyPinTopLabel()
  },

  async getComments(page: Page) {
    const iframe = page.locator(SELECTORS.LIVE_CONTROL_IFRAME)
    const comments = await iframe.locator('.live-message-item-container .message-content').all()
    if (comments.length === 0) {
      return Result.fail(new ElementNotFoundError({ elementName: '评论' }))
    }
    return Result.succeed(comments)
  },

  async getNewCommentButton(page: Page): Result.ResultAsync<Locator, PlatformError> {
    const newCommentButton = page.locator('.comment__load')
    if (await newCommentButton.isVisible()) {
      return Result.succeed(newCommentButton)
    }
    return Result.fail(
      new ElementNotFoundError({
        elementName: '新消息按钮',
        selector: SELECTORS.commentInput.SUBMIT_BUTTON,
      }),
    )
  },

  getPinCommentActionItem(page: Page) {
    return page.locator(
      '.live-message-container .action-popover .action-popover__action-item:text("上墙")',
    )
  },
}
