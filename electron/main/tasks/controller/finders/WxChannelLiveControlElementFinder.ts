import type { ElementHandle, Locator } from 'playwright'
import { wxchannel as wxchannelConst } from '#/constants'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class WxChannelLiveControlElementFinder extends LiveControlElementFinder {
  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const button = await item.$(wxchannelConst.selectors.goodsItem.POPUP_BUTTON)
    if (!button) {
      throw new Error('找不到讲解按钮')
    }
    return button
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const span = await item.$(wxchannelConst.selectors.goodsItem.ID)
    const id = Number.parseInt((await span?.textContent()) ?? '')
    if (Number.isNaN(id)) {
      throw new Error('商品序号并非数字！')
    }
    return id
  }

  public async getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  > {
    const itemsList = await this.page.$$(wxchannelConst.selectors.GOODS_ITEM)
    if (itemsList.length <= 1) {
      return itemsList
    }
    // 视频号可能是倒序的，需要转成正序
    const firstIdValue = await this.getIdFromGoodsItem(itemsList[0])
    const lastIdValue = await this.getIdFromGoodsItem(
      itemsList[itemsList.length - 1],
    )
    // 倒序，转成正序
    if (firstIdValue > lastIdValue) {
      itemsList.reverse()
    }
    // 暂时不用担心倒序可能会对后面的滚动查找元素有影响，因为视频号似乎没有虚拟列表，能把所有商品全部加载进来
    return itemsList
  }

  public getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    // 视频号没有虚拟列表，且直接遍历所有元素，按理说不会触发这个函数
    throw new Error('未找到商品：请确认商品序号是否在范围内')
  }

  public async getCommentTextarea(): Promise<
    ElementHandle<SVGElement | HTMLElement> | Locator | null
  > {
    const iframe = this.page.locator(
      wxchannelConst.selectors.LIVE_CONTROL_IFRAME,
    )
    const textarea = iframe.locator(
      wxchannelConst.selectors.commentInput.TEXTAREA,
    )
    return textarea
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const button = await this.page.$(
      wxchannelConst.selectors.commentInput.SUBMIT_BUTTON,
    )
    if (!button) {
      throw new Error('找不到发送按钮')
    }
    if (
      (await button.getAttribute('class'))?.includes(
        wxchannelConst.selectors.commentInput.SUBMIT_BUTTON_DISABLED,
      )
    ) {
      throw new Error('无法点击发送按钮')
    }
    return button
  }

  public async getPinTopLabel(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return null
  }
}
