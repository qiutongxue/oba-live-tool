import type { ElementHandle } from 'playwright'
import { douyin as douyinConst, error } from '#/constants'
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
    if (!submit_btn) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (
      (await submit_btn.getAttribute('class'))?.includes(
        douyinConst.selectors.commentInput.SUBMIT_BUTTON_DISABLED,
      )
    ) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return submit_btn
  }

  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ) {
    const goodsAction = await item.$(douyinConst.selectors.goodsItem.ACTION)
    if (!goodsAction) {
      throw new Error(error.elementFinder.ACTION_PANEL_NOT_FOUND)
    }
    // 默认获取第一个元素，就是讲解按钮所在的位置
    const button = await goodsAction.$(
      douyinConst.selectors.goodsItem.POPUP_BUTTON,
    )
    // const button = await presBtnWrap?.$('button')
    if (!button) {
      throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
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
    const id = Number.parseInt((await idInput?.inputValue()) ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  }

  public async getCommentTextarea() {
    return this.page.$(douyinConst.selectors.commentInput.TEXTAREA)
  }
}
