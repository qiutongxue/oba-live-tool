import type { ElementHandle, Page } from 'playwright'

export abstract class LiveControlElementFinder {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  public abstract getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>>
  public abstract getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number>
  public abstract getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  >
  public abstract getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
  public abstract getCommentTextarea(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
  public abstract getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
  public abstract getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null>
}
