import type { ElementHandle, Page } from 'playwright'
import { sleep } from '#/utils'
import type { IElementFinder } from './IElementFinder'

export async function connect(
  page: Page,
  loginConstants: {
    liveControlUrl: string
    loginUrlRegex: RegExp
    isInLiveControlSelector: string
  },
) {
  await page.goto(loginConstants.liveControlUrl, {
    waitUntil: 'domcontentloaded',
  })
  await Promise.race([
    page.waitForURL(loginConstants.loginUrlRegex, {
      timeout: 0,
      waitUntil: 'domcontentloaded',
    }),
    page.waitForSelector(loginConstants.isInLiveControlSelector, {
      timeout: 0,
    }),
  ])

  const isConnected = !loginConstants.loginUrlRegex.test(page.url())
  return isConnected
}

export async function getAccountName(page: Page, accountNameSelector: string) {
  return page.waitForSelector(accountNameSelector).then(el => el.textContent())
}

export async function comment(
  page: Page,
  elementFinder: IElementFinder,
  message: string,
  pinTop?: boolean,
) {
  async function clickPinTopButton(page: Page) {
    const pinTopLabel = await elementFinder.getPinTopLabel(page)
    if (!pinTopLabel) {
      // this.logger.warn('找不到置顶选项，不进行置顶')
      return false
    }
    await pinTopLabel.dispatchEvent('click')
    return true
  }

  const textarea = await elementFinder.getCommentTextarea(page)
  if (!textarea) {
    throw new Error('找不到评论框')
  }

  await textarea.fill(message)

  let successPinTop = false

  if (pinTop) {
    successPinTop = await clickPinTopButton(page)
  }

  const submit_btn = await elementFinder.getClickableSubmitCommentButton(page)
  if (!submit_btn) {
    throw new Error('无法点击发布按钮')
  }
  await submit_btn.dispatchEvent('click')

  return {
    pinTop: successPinTop,
  }
}

/** 在虚拟列表中找到目标序号的位置 */
export async function virtualScroller(
  page: Page,
  elementFinder: IElementFinder,
  targetId: number,
  maxRetries = 10,
) {
  const SCROLL_TOLERANCE = 10
  const LOAD_WAIT_MS = 1000

  /**
   * 在当前渲染的DOM节点中查找具有特定ID的商品。
   */
  async function findItemInCurrentView(id: number) {
    const currentGoodsItems = await elementFinder.getCurrentGoodsItemsList(page)
    if (currentGoodsItems.length === 0) {
      return null
    }

    try {
      // 并发执行，效率比顺序遍历快了10倍以上
      const foundItem = await Promise.any(
        currentGoodsItems.map(async goodsItem => {
          const itemId = await elementFinder.getIdFromGoodsItem(goodsItem)
          if (itemId !== id) {
            throw new Error('未匹配')
          }
          return goodsItem
        }),
      )
      return foundItem
    } catch {
      return null
    }
  }

  /**
   * 根据目标ID和当前列表的ID范围，决定下一个滚动的锚点元素（列表的第一个或最后一个）。
   */
  async function determineScrollTarget(id: number) {
    const currentGoodsItems = await elementFinder.getCurrentGoodsItemsList(page)
    if (currentGoodsItems.length === 0) {
      return null
    }

    const firstItem = currentGoodsItems[0]
    const lastItem = currentGoodsItems[currentGoodsItems.length - 1]

    const firstId = await elementFinder.getIdFromGoodsItem(firstItem)
    const lastId = await elementFinder.getIdFromGoodsItem(lastItem)

    // 判断列表是正序还是倒序
    const isReversed = firstId > lastId

    // logger.warn(`商品 ${id} 不在当前范围 [${firstId} ~ ${lastId}]，继续滚动查找...`);

    // 目标ID小于当前范围的起始ID (正序) 或 大于 (倒序)，需要向上滚
    if ((!isReversed && id < firstId) || (isReversed && id > firstId)) {
      return firstItem
    }

    // 否则，向下滚
    return lastItem
  }

  /**
   * 等待列表加载新内容。
   */
  async function waitForNewItemsToLoad() {
    // 最后的备选方案：短暂 sleep
    await sleep(LOAD_WAIT_MS)
  }

  let lastScrollTop = Number.NaN
  let retries = 0

  while (retries < maxRetries) {
    // 1. 在当前视图中查找
    const foundItem = await findItemInCurrentView(targetId)
    if (foundItem) {
      return foundItem
    }

    // 2. 获取滚动容器和当前滚动位置
    const scrollContainer =
      await elementFinder.getGoodsItemsScrollContainer(page)
    if (!scrollContainer) {
      throw new Error('找不到滚动容器')
    }

    // 4. 判断滚动方向并执行滚动
    const scrollTarget = await determineScrollTarget(targetId)
    if (!scrollTarget) {
      throw new Error('当前列表为空，无法确定滚动方向')
    }
    await scrollTarget.scrollIntoViewIfNeeded()

    // 5. 等待新内容加载 (更优的等待方式)
    await waitForNewItemsToLoad()

    // 3. 检查是否滚动到底了 (终止条件)
    const currentScrollTop = await scrollContainer.evaluate(el => el.scrollTop)
    if (
      !Number.isNaN(lastScrollTop) &&
      Math.abs(lastScrollTop - currentScrollTop) <= SCROLL_TOLERANCE
    ) {
      // logger.debug(`滚动位置未改变，无法找到更多内容。ScrollTop: ${currentScrollTop}`);
      throw new Error(`在尝试滚动 ${retries} 次后，仍未找到商品 ${targetId}`)
    }
    lastScrollTop = currentScrollTop

    retries++
  }

  throw new Error(`超过最大重试次数 ${maxRetries}，仍未找到商品 ${targetId}`)
}

export async function toggleButton(
  button: ElementHandle<SVGElement | HTMLElement>,
  sourceContent: string,
  targetContent: string,
) {
  const clickPopUpButton = async (
    button: ElementHandle<SVGElement | HTMLElement>,
  ) => {
    const buttonText = (await button.textContent())?.trim()
    if (buttonText !== sourceContent && buttonText !== targetContent) {
      throw new Error(`不是${targetContent}按钮，是 ${buttonText} 按钮`)
    }
    await button.dispatchEvent('click')
    return buttonText
  }

  while ((await clickPopUpButton(button)) === sourceContent) {
    await sleep(1000)
  }
}

/** 确保 page 非空，若 Page 为空，抛出错误消息 */
export function ensurePage(page: Page | null): asserts page is Page {
  if (!page) {
    throw new Error('找不到页面，请先确认是否已连接到中控台')
  }
}
