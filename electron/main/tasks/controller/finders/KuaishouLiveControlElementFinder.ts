import type { ElementHandle, Locator } from 'playwright'
import { error, kuaishou } from '#/constants'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class KuaishouLiveControlElementFinder extends LiveControlElementFinder {
  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const button = await item.$(kuaishou.selectors.goodsItem.POPUP_BUTTON)
    if (!button) {
      throw new Error(error.elementFinder.PROMOTING_BTN_NOT_FOUND)
    }
    return button
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const idInput = await item.$(kuaishou.selectors.goodsItem.ID)
    const idInputValue = await idInput?.inputValue()
    const id = Number.parseInt(idInputValue ?? '')
    if (Number.isNaN(id)) {
      throw new Error(error.elementFinder.GOODS_ID_IS_NOT_A_NUMBER)
    }
    return id
  }

  public async getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  > {
    const items = await this.page.$$(kuaishou.selectors.GOODS_ITEM)
    // 过滤掉置顶的正在弹窗商品（因为没有序号）
    // 每个 item 都有 id，过滤掉以 recording 结尾的 id（如 inner_c1goods-xxxxxxxxxx-recording）
    const filteredItems = []
    for (const item of items) {
      if (!(await item.getAttribute('id'))?.endsWith('recording')) {
        filteredItems.push(item)
      }
    }
    return filteredItems
  }

  public async getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$(kuaishou.selectors.GOODS_ITEMS_WRAPPER)
  }

  public getCommentTextarea(): Promise<
    ElementHandle<SVGElement | HTMLElement> | Locator | null
  > {
    return this.page.$(kuaishou.selectors.commentInput.TEXTAREA)
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const submitButton = await this.page.$(
      kuaishou.selectors.commentInput.SUBMIT_BUTTON,
    )
    if (!submitButton) {
      throw new Error(error.elementFinder.SUBMIT_BTN_NOT_FOUND)
    }
    if (await submitButton.isDisabled()) {
      throw new Error(error.elementFinder.SUBMIT_BTN_DISABLED)
    }
    return submitButton
  }

  public getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$(kuaishou.selectors.commentInput.PIN_TOP_LABEL)
  }
}
