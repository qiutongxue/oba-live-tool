import type { ElementHandle } from 'playwright'
import {
  COMMENT_TEXTAREA_SELECTOR,
  GOODS_ACTION_SELECTOR,
  GOODS_ITEM_SELECTOR,
  PIN_TOP_SELECTOR,
  SUBMIT_COMMENT_SELECTOR,
} from '#/constants'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class BuyinLiveControlElementFinder extends LiveControlElementFinder {
  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const pinTopLabel = await this.page.$(PIN_TOP_SELECTOR)
    return pinTopLabel
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const submit_btn = await this.page.$(SUBMIT_COMMENT_SELECTOR)
    if (
      !submit_btn ||
      (await submit_btn.getAttribute('class'))?.includes('isDisabled')
    ) {
      throw new Error('无法点击发布按钮')
    }
    return submit_btn
  }

  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLButtonElement>> {
    const goodsAction = await item.$(GOODS_ACTION_SELECTOR)
    if (!goodsAction) {
      throw new Error('找不到商品操作按钮')
    }
    // 默认获取第一个元素，就是讲解按钮所在的位置
    const presBtnWrap = await goodsAction.$(`div[class*="wrapper"]:has(button)`)
    const button = await presBtnWrap?.$('button')
    if (!button) {
      throw new Error('找不到讲解按钮')
    }
    return button
  }

  public async getGoodsItemsScrollContainer() {
    return this.page.$('#live-control-goods-list-container div')
  }

  public async getCurrentGoodsItemsList() {
    return this.page.$$(GOODS_ITEM_SELECTOR)
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const idInput = await item.$(`div[class^="indexWrapper"] input`)
    return Number.parseInt(
      (await idInput?.evaluate(el => (el as HTMLInputElement).value)) ?? '',
    )
  }

  public async getCommentTextarea() {
    return this.page.$(COMMENT_TEXTAREA_SELECTOR)
  }
}
