import { Result } from '@praha/byethrow'
import type { ElementHandle, Page } from 'playwright'
import {
  ElementContentMismatchedError,
  ElementDisabledError,
  ElementNotFoundError,
} from '#/errors/PlatformError'
import type { IElementFinder } from '../IElementFinder'

export const devElementFinder: IElementFinder = {
  async getPopUpButtonFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    const button = await item.$('button.btn-explain')
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({ elementName: '讲解按钮', selector: 'button.btn-explain' }),
      )
    }
    return Result.succeed(button)
  },
  async getIdFromGoodsItem(item: ElementHandle<SVGElement | HTMLElement>) {
    const idWrapper = await item.$(':text("#")')
    if (!idWrapper) {
      return Result.fail(
        new ElementNotFoundError({ elementName: '商品ID', selector: ':text("#")' }),
      )
    }
    const idText = (await idWrapper.textContent())?.match(/\d+/)?.[0] ?? ''
    const id = Number.parseInt(idText, 10)
    if (!id) {
      return Result.fail(
        new ElementContentMismatchedError({
          current: idText,
          target: '数字',
        }),
      )
    }
    return Result.succeed(Number(id))
  },

  async getCurrentGoodsItemsList(page: Page) {
    const itemsList = await page.$$('.product-list__item')
    if (!itemsList.length) {
      return Result.fail(
        new ElementNotFoundError({ elementName: '商品列表', selector: 'product-list__item' }),
      )
    }
    return Result.succeed(itemsList)
  },

  async getGoodsItemsScrollContainer(page: Page) {
    const scrollContainer = await page.$('.virtual-list-container')
    if (!scrollContainer) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '商品列表滚动容器',
          selector: '.virtual-list-container',
        }),
      )
    }
    return Result.succeed(scrollContainer)
  },
  async getCommentTextarea(page: Page) {
    const textarea = await page.$('.chat-input-area input[type=text]')
    if (!textarea) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '评论框',
          selector: '.chat-input-area input[type=text]',
        }),
      )
    }
    return Result.succeed(textarea)
  },
  async getClickableSubmitCommentButton(page: Page) {
    const button = await page.$('.chat-input-area button')
    if (!button) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '发送按钮',
          selector: '.chat-input-area button',
        }),
      )
    }
    if (await button.isDisabled()) {
      return Result.fail(
        new ElementDisabledError({
          elementName: '发送按钮',
          element: await button.evaluate(el => el.outerHTML),
        }),
      )
    }
    return Result.succeed(button)
  },

  async getPinTopLabel(_page: Page) {
    return Result.fail(
      new ElementNotFoundError({
        elementName: '置顶标签',
        selector: '.pin-top-label',
      }),
    )
  },
}
