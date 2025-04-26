import type { ElementHandle } from 'playwright'
import { redbookConst } from '#/constants'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class RedbookLiveControlElementFinder extends LiveControlElementFinder {
  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const pannel = await item.$(
      redbookConst.selectors.goodsItem.OPERATION_PANNEL,
    )
    if (!pannel) {
      throw new Error('找不到操作栏')
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
          await operation.evaluate(e =>
            e.classList.contains(
              redbookConst.selectors.goodsItem.POPUP_BUTTON_DISABLED,
            ),
          )
        ) {
          throw new Error(
            `无法点击${redbookConst.selectors.goodsItem.POPUP_BUTTON_TEXT}，可能未开播`,
          )
        }
        return operation
      }
    }
    throw new Error(
      `找不到${redbookConst.selectors.goodsItem.POPUP_BUTTON_TEXT}按钮`,
    )
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const input = await item.$(redbookConst.selectors.goodsItem.ID)
    return Number.parseInt(
      (await input?.evaluate(el => (el as HTMLInputElement).value)) ?? '',
    )
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
      throw new Error('找不到发送按钮')
    }
    if (
      await submitButton.evaluate(el =>
        el.className.includes(
          redbookConst.selectors.commentInput.SUBMIT_BUTTON_DISABLED,
        ),
      )
    ) {
      throw new Error('无法点击发送按钮，可能未输入文字')
    }
    return submitButton
  }

  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  }
}
