import type { ElementHandle } from 'playwright'
import { error, redbook as redbookConst } from '#/constants'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class RedbookLiveControlElementFinder extends LiveControlElementFinder {
  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const pannel = await item.$(
      redbookConst.selectors.goodsItem.OPERATION_PANNEL,
    )
    if (!pannel) {
      throw new Error(error.elementFinder.ACTION_PANEL_NOT_FOUND)
    }
    const operations = await pannel.$$(
      redbookConst.selectors.goodsItem.OPERATION_ITEM,
    )
    for (const operation of operations) {
      if (
        (await operation.textContent())?.includes(
          redbookConst.selectors.goodsItem.POPUP_BUTTON_TEXT,
        )
      ) {
        if (
          await operation.evaluate(
            (e, redbookConst) =>
              e.classList.contains(
                redbookConst.selectors.goodsItem.POPUP_BUTTON_DISABLED,
              ),
            redbookConst,
          )
        ) {
          throw new Error(error.elementFinder.PROMOTING_BTN_DISABLED)
        }
        return operation
      }
    }
    throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const input = await item.$(redbookConst.selectors.goodsItem.ID)
    const id = Number.parseInt((await input?.inputValue()) ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  }

  public async getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  > {
    const goodsItemsList = await this.page.$$(redbookConst.selectors.GOODS_ITEM)
    return goodsItemsList
  }

  public getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$(redbookConst.selectors.GOODS_ITEMS_WRAPPER)
  }

  public getCommentTextarea(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$(redbookConst.selectors.commentInput.TEXTAREA)
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const submitButton = await this.page.$(
      redbookConst.selectors.commentInput.SUBMIT_BUTTON,
    )
    if (!submitButton) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (
      await submitButton.evaluate(
        (el, redbookConst) =>
          el.className.includes(
            redbookConst.selectors.commentInput.SUBMIT_BUTTON_DISABLED,
          ),
        redbookConst,
      )
    ) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return submitButton
  }

  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  }
}
