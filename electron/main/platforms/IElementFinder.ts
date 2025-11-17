import { Result } from '@praha/byethrow'
import type { ElementHandle, Locator, Page } from 'playwright'
import {
  ElementContentMismatchedError,
  ElementNotFoundError,
  type PlatformError,
} from '#/errors/PlatformError'

export interface IElementFinder {
  /** 从单个商品详情中获取弹窗按钮 */
  getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Result.ResultAsync<ElementHandle<HTMLElement | SVGElement>, PlatformError>

  getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Result.ResultAsync<number, PlatformError>

  /** 能保证商品列表不为空 */
  getCurrentGoodsItemsList(
    page: Page,
  ): Result.ResultAsync<
    ElementHandle<SVGElement | HTMLElement>[],
    PlatformError
  >

  getGoodsItemsScrollContainer(
    page: Page,
  ): Result.ResultAsync<ElementHandle<SVGElement | HTMLElement>, PlatformError>

  getCommentTextarea(
    page: Page,
  ): Result.ResultAsync<
    ElementHandle<SVGElement | HTMLElement> | Locator,
    PlatformError
  >

  getClickableSubmitCommentButton(
    page: Page,
  ): Result.ResultAsync<ElementHandle<SVGElement | HTMLElement>, PlatformError>

  /** 获取评论置顶标签，如果置顶标签不存在返回 Fail */
  getPinTopLabel(
    page: Page,
  ): Result.ResultAsync<ElementHandle<SVGElement | HTMLElement>, PlatformError>
}

export const commonElementFinder = {
  async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
    idSelector: string,
  ) {
    const idInput = await (await item.$(idSelector))?.inputValue()
    if (!idInput) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '商品ID',
          selector: idSelector,
        }),
      )
    }
    const id = Number.parseInt(idInput, 10)
    if (Number.isNaN(id)) {
      return Result.fail(
        new ElementContentMismatchedError({
          current: idInput,
          target: '数字',
        }),
      )
    }
    return Result.succeed(id)
  },

  async getCommentTextarea(page: Page, textareaSelector: string) {
    const textarea = await page.$(textareaSelector)
    if (!textarea) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '评论框',
          selector: textareaSelector,
        }),
      )
    }
    return Result.succeed(textarea)
  },

  async getGoodsItemsScrollContainer(page: Page, containerSelector: string) {
    const scrollContainer = await page.$(containerSelector)
    if (!scrollContainer) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '商品列表滚动容器',
          selector: containerSelector,
        }),
      )
    }
    return Result.succeed(scrollContainer)
  },

  async getCurrentGoodsItemsList(page: Page, itemSelector: string) {
    const items = await page.$$(itemSelector)
    if (items.length === 0) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '商品列表',
          selector: itemSelector,
        }),
      )
    }
    return Result.succeed(items)
  },

  async getPinTopLabel(page: Page, labelSelector: string) {
    const label = await page.$(labelSelector)
    if (!label) {
      return Result.fail(
        new ElementNotFoundError({
          elementName: '评论置顶标签',
          selector: labelSelector,
        }),
      )
    }
    return Result.succeed(label)
  },

  async getEmptyPinTopLabel() {
    return Result.fail(new ElementNotFoundError({ elementName: '置顶选项' }))
  },
}
