import type { ElementHandle, Locator, Page } from 'playwright'

export interface IElementFinder {
  /** 从单个商品详情中获取弹窗按钮 */
  getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>>

  getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number>

  getCurrentGoodsItemsList(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement>[]>

  getGoodsItemsScrollContainer(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null>

  getCommentTextarea(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | Locator | null>

  getClickableSubmitCommentButton(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null>

  getPinTopLabel(
    page: Page,
  ): Promise<ElementHandle<SVGElement | HTMLElement> | null>
}
