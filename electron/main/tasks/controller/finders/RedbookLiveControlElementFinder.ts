import type { ElementHandle } from 'playwright'
import { LiveControlElementFinder } from '../LiveControlElementFinder'

export class RedbookLiveControlElementFinder extends LiveControlElementFinder {
  public async getPopUpButtonFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ElementHandle<HTMLElement | SVGElement>> {
    const pannel = await item.$('.more-operation')
    if (!pannel) {
      throw new Error('找不到操作栏')
    }
    const operations = await pannel.$$('.operation-item')
    for (const operation of operations) {
      if ((await operation.textContent())?.includes('弹卡')) {
        if (
          await operation.evaluate(e => e.classList.contains('disabled-btn'))
        ) {
          throw new Error('无法点击弹卡，可能未开播')
        }
        return operation
      }
    }
    throw new Error('找到不到弹卡的按钮')
  }

  public async getIdFromGoodsItem(
    item: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<number> {
    const input = await item.$('td:first-child input')
    return Number.parseInt(
      (await input?.evaluate(el => (el as HTMLInputElement).value)) ?? '',
    )
  }

  public async getCurrentGoodsItemsList(): Promise<
    ElementHandle<SVGElement | HTMLElement>[]
  > {
    const goodsItemsList = await this.page.$$(
      '.goods-list .table-wrap > div > div > table tbody tr',
    )
    return goodsItemsList
  }

  public getGoodsItemsScrollContainer(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$('.table-wrap > div > div')
  }

  public getCommentTextarea(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    return this.page.$('.comment-input textarea')
  }

  public async getClickableSubmitCommentButton(): Promise<ElementHandle<
    SVGElement | HTMLElement
  > | null> {
    const submitButton = await this.page.$('.comment-input button')
    if (!submitButton) {
      throw new Error('找不到发送按钮')
    }
    if (await submitButton.evaluate(el => el.className.includes('disabled'))) {
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
