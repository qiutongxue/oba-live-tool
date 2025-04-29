import type { ElementHandle } from 'playwright'
import { douyin as douyinConst } from '#/constants'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class BuyinLiveControlElementFinder extends LiveControlElementFinder {
  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const pinTopLabel = await this.page.$(
      douyinConst.selectors.commentInput.PIN_TOP_LABEL,
    )
    return pinTopLabel
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const submit_btn = await this.page.$(
      douyinConst.selectors.commentInput.SUBMIT_BUTTON,
    )
    if (
      !submit_btn ||
      (await submit_btn.getAttribute('class'))?.includes(
        douyinConst.selectors.commentInput.SUBMIT_BUTTON_DISABLED,
      )
    ) {
      throw new Error('无法点击发布按钮')
    }
    return submit_btn
  }

  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const goodsAction = await item.$(douyinConst.selectors.goodsItem.ACTION)
    if (!goodsAction) {
      throw new Error('找不到商品操作按钮')
    }
    // 默认获取第一个元素，就是讲解按钮所在的位置
    const button = await goodsAction.$(
      douyinConst.selectors.goodsItem.POPUP_BUTTON,
    )
    // const button = await presBtnWrap?.$('button')
    if (!button) {
      throw new Error('找不到讲解按钮')
    }
    return button
  }

  public async getGoodsItemsScrollContainer() {
    return this.page.$(douyinConst.selectors.GOODS_ITEMS_WRAPPER)
  }

  public async getCurrentGoodsItemsList() {
    return this.page.$$(douyinConst.selectors.GOODS_ITEM)
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const idInput = await item.$(douyinConst.selectors.goodsItem.ID)
    return Number.parseInt(
      (await idInput?.evaluate(el => (el as HTMLInputElement).value)) ?? '',
    )
  }

  public async getCommentTextarea() {
    return this.page.$(douyinConst.selectors.commentInput.TEXTAREA)
  }
}
