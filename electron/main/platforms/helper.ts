import { Result } from '@praha/byethrow'
import type { ElementHandle, Page } from 'playwright'
import { UnexpectedError } from '#/errors/AppError'
import {
  ElementContentMismatchedError,
  ElementDisabledError,
  ElementNotFoundError,
  MaxTryCountExceededError,
  PageNotFoundError,
  type PlatformError,
} from '#/errors/PlatformError'
import { abortableSleep, sleep } from '#/utils'
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
      state: 'attached',
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
): Result.ResultAsync<boolean, PlatformError> {
  async function clickPinTopButton(page: Page): Result.ResultAsync<boolean, PlatformError> {
    return Result.pipe(
      elementFinder.getPinTopLabel(page),
      Result.inspect(label => label.dispatchEvent('click')),
      Result.map(_ => true),
      // 即使没有 pinTop 也不会中断程序
      Result.orElse(_ => Result.succeed(false)),
    )
  }

  return Result.pipe(
    // 评论框
    elementFinder.getCommentTextarea(page),
    // 填写评论内容
    Result.inspect(textarea => textarea.fill(message, { timeout: 5000 })),
    // 点击置顶选项
    Result.andThen(_ => (pinTop ? clickPinTopButton(page) : Result.succeed(false))),
    // 发送评论
    Result.andThrough(_ =>
      Result.pipe(
        // 直接点击发送评论按钮
        elementFinder.getClickableSubmitCommentButton(page),
        Result.inspect(btn => btn.dispatchEvent('click')),
        // 下策：尝试直接用 Enter 发送评论
        Result.orElse(err => {
          if (err.name === 'ElementNotFoundError') {
            return Result.pipe(
              elementFinder.getCommentTextarea(page),
              Result.andThen(textarea => {
                return Result.try({
                  try: () => textarea.press('Enter'),
                  catch: _ => err,
                  immediate: true,
                })
              }),
            )
          }
          return Result.fail(err)
        }),
      ),
    ),
  )
}

/** 在虚拟列表中找到目标序号的位置 */
export async function getItemFromVirtualScroller(
  page: Page,
  elementFinder: IElementFinder,
  targetId: number,
  maxRetries = 10,
): Result.ResultAsync<ElementHandle<SVGElement | HTMLElement>, PlatformError> {
  const SCROLL_TOLERANCE = 10
  const LOAD_WAIT_MS = 1000

  /**
   * 在当前渲染的DOM节点中查找具有特定ID的商品。
   */
  async function findItemInCurrentView(id: number) {
    const currentGoodsItems = await elementFinder.getCurrentGoodsItemsList(page)
    if (Result.isFailure(currentGoodsItems)) {
      return currentGoodsItems
    }
    try {
      // 并发执行，效率比顺序遍历快了10倍以上
      const foundItem = await Promise.any(
        currentGoodsItems.value.map(async goodsItem => {
          const itemIdResult = await elementFinder.getIdFromGoodsItem(goodsItem)
          if (Result.isSuccess(itemIdResult) && itemIdResult.value === id) {
            return goodsItem
          }
          throw new Error('未匹配')
        }),
      )
      return Result.succeed(foundItem)
    } catch (err) {
      // Promise.any 全部出错抛出的错误为 AggregateError
      // 表示全部都未找到
      if (err instanceof AggregateError) {
        return Result.succeed(null)
      }
      return Result.fail(new UnexpectedError({ cause: err }))
    }
  }

  /**
   * 根据目标ID和当前列表的ID范围，决定下一个滚动的锚点元素（列表的第一个或最后一个）。
   */
  async function determineScrollTarget(
    id: number,
  ): Result.ResultAsync<ElementHandle<SVGElement | HTMLElement>, PlatformError> {
    const currentGoodsItems = await elementFinder.getCurrentGoodsItemsList(page)
    if (Result.isFailure(currentGoodsItems)) {
      return currentGoodsItems
    }

    const firstItem = currentGoodsItems.value[0]
    const lastItem = currentGoodsItems.value[currentGoodsItems.value.length - 1]

    return Result.pipe(
      Result.sequence([
        elementFinder.getIdFromGoodsItem(firstItem),
        elementFinder.getIdFromGoodsItem(lastItem),
      ]),
      Result.andThen(([firstId, lastId]) => {
        // 判断列表是正序还是倒序
        const isReversed = firstId > lastId
        // logger.warn(`商品 ${id} 不在当前范围 [${firstId} ~ ${lastId}]，继续滚动查找...`);
        // 目标ID小于当前范围的起始ID (正序) 或 大于 (倒序)，需要向上滚
        if ((!isReversed && id < firstId) || (isReversed && id > firstId)) {
          return Result.succeed(firstItem)
        }
        // 否则，向下滚
        return Result.succeed(lastItem)
      }),
    )
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
    if (Result.isFailure(foundItem)) {
      return foundItem
    }
    if (foundItem.value) {
      return Result.succeed(foundItem.value)
    }

    // 1. 先找到目标点并滚动
    const scrollTarget = await determineScrollTarget(targetId)
    if (Result.isFailure(scrollTarget)) {
      return scrollTarget
    }
    await scrollTarget.value.scrollIntoViewIfNeeded({ timeout: 5000 })
    await waitForNewItemsToLoad()

    // 2. 获取当前的滚动位置
    const scrollContainer = await elementFinder.getGoodsItemsScrollContainer(page)
    if (Result.isFailure(scrollContainer)) {
      return scrollContainer
    }
    const currentScrollTop = await scrollContainer.value.evaluate(el => el.scrollTop)

    // 3. 检查是否滚动到底了 (终止条件)
    if (
      !Number.isNaN(lastScrollTop) &&
      Math.abs(lastScrollTop - currentScrollTop) <= SCROLL_TOLERANCE
    ) {
      // logger.debug(`滚动位置未改变，无法找到更多内容。ScrollTop: ${currentScrollTop}`);
      return Result.fail(
        new ElementNotFoundError({
          elementName: `id为${targetId}的商品`,
        }),
      )
    }
    lastScrollTop = currentScrollTop

    retries++
  }

  return Result.fail(
    new MaxTryCountExceededError({
      taskName: '查找商品',
      maxTryCount: maxRetries,
    }),
  )
}

const TOGGLE_BUTTON_MAX_TRY_COUNT = 5
export async function toggleButton(
  button: ElementHandle<SVGElement | HTMLElement>,
  sourceContent: string,
  targetContent: string,
  signal?: AbortSignal,
  tryCount = 0,
): Result.ResultAsync<void, Error> {
  if (tryCount > TOGGLE_BUTTON_MAX_TRY_COUNT) {
    return Result.fail(
      new MaxTryCountExceededError({
        taskName: 'toggleButton',
        maxTryCount: TOGGLE_BUTTON_MAX_TRY_COUNT,
      }),
    )
  }

  let buttonText = ''
  let disabled = false
  try {
    buttonText = (await button.textContent())?.trim() || ''
    if (buttonText !== sourceContent && buttonText !== targetContent) {
      return Result.fail(
        new ElementContentMismatchedError({
          current: buttonText,
          target: `${targetContent} 或 ${sourceContent}`,
        }),
      )
    }

    // 两种情况：
    // 1. 商品未讲解：buttonText === sourceContent，点击变为 targetContent 即可
    // 2. 商品正在讲解：需要先点击一次取消讲解，变为未讲解状态
    if (buttonText === targetContent && tryCount > 0) {
      return Result.succeed()
    }
    disabled = await button.isDisabled()
  } catch (err) {
    /**
     * ⚠️ 页面重渲染会让 ElementHandle 失效，此时 textContent / isDisabled 会直接抛
     * `elementHandle.isDisabled: Element is not attached to the DOM`。
     * 这个异常绝不能抛给任务调度层：它会穿透 runWithRetry（那里没有 try/catch），
     * 让 IntervalTask 直接把「自动弹窗」任务判定为「错误中断」并退出，重试形同虚设。
     *
     * 已经点过（tryCount > 0）时，说明点击已经派发、元素是被这次点击引发的重渲染
     * 挤掉的，此时**视为本次切换成功**——否则重新解析元素后再点一次，会把刚弹出的
     * 讲解又关掉（反向操作）。
     */
    if (tryCount > 0) {
      return Result.succeed()
    }
    return Result.fail(err instanceof Error ? err : new UnexpectedError({ cause: err }))
  }

  if (disabled) {
    const elementHtml = await button.evaluate(el => el.outerHTML).catch(() => '')
    return Result.fail(
      new ElementDisabledError({
        elementName: '讲解按钮',
        element: elementHtml,
      }),
    )
  }

  // button.click() 在抖店&百应的表现很诡异，所以用 dispatchEvent('click')
  try {
    await button.dispatchEvent('click')
  } catch (err) {
    return Result.fail(err instanceof Error ? err : new UnexpectedError({ cause: err }))
  }

  return Result.pipe(
    abortableSleep(1000, signal),
    Result.andThen(() => toggleButton(button, sourceContent, targetContent, signal, tryCount + 1)),
  )
}

/** 确保 page 非空 */
export function ensurePage(page: Page | null | undefined): Result.Result<Page, PlatformError> {
  if (!page) {
    return Result.fail(new PageNotFoundError())
  }
  return Result.succeed(page)
}

/** 通过 \<a\> 的点击打开新网页，主要是防止部分反爬的行为 */
export async function openUrlByElement(page: Page, url: string) {
  const context = page.context()
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.evaluate(url => {
      const el = document.createElement('a')
      el.href = url
      el.target = '_blank'
      el.click()
    }, url),
  ])
  return newPage
}
