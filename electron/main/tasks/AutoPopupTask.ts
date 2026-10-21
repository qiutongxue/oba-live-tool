import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { AbortError, UnexpectedError } from '#/errors/AppError'
import type { ScopedLogger } from '#/logger'
import type { IPerformPopup } from '#/platforms/IPlatform'
import { mergeWithoutArray, randomInt, takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import { createIntervalTask } from './IntervalTask'
import { runWithRetry } from './retry'

const TASK_NAME = '自动弹窗'

const retryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
}

/** 单个商品的执行计划：count 为 Infinity 表示无限循环 */
type PlanStep = { id: number; interval: [number, number]; count: number }

/** 有限次数的上限（「无限循环」不受此限制） */
const MAX_REPEAT = 10000

/**
 * 把商品列表编译成「加权执行计划」。
 *
 * - 有限次数：与原先「按次数展开成数组再取模轮转」的序列**完全一致**；
 * - `repeatInfinite`：count = Infinity，表示永远参与轮转，不受 10000 上限约束。
 *
 * 不再把次数展开成数组，因为无限次数无法物化，且大次数会占用大量内存。
 */
function buildPlan(config: AutoPopupConfig): PlanStep[] {
  const globalInterval = config.scheduler.interval
  const items = config.goodsItems
  if (!items || items.length === 0) {
    // 兼容旧配置：没有 goodsItems 时用 goodsIds
    return config.goodsIds.map(id => ({ id, interval: globalInterval, count: 1 }))
  }
  return items.map(item => ({
    id: item.id,
    interval:
      item.itemInterval && item.itemInterval[0] > 0 && item.itemInterval[1] > 0
        ? item.itemInterval
        : globalInterval,
    count: item.repeatInfinite
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Math.min(Math.floor(item.repeatCount ?? 1), MAX_REPEAT)),
  }))
}

export function createAutoPopupTask(
  platform: IPerformPopup,
  taskConfig: AutoPopupConfig,
  account: Account,
  _logger: ScopedLogger,
) {
  const logger = _logger.scope(TASK_NAME)
  let config = { ...taskConfig }
  let plan = buildPlan(config)
  /** 当前处在计划的哪一段 */
  let planIndex = 0
  /** 当前这一段已经执行了几次 */
  let usedInStep = 0

  const intervalTaskResult = createIntervalTask(execute, {
    interval: config.scheduler.interval,
    taskName: TASK_NAME,
    logger,
  })

  if (Result.isFailure(intervalTaskResult)) {
    return intervalTaskResult
  }

  const intervalTask = intervalTaskResult.value

  async function execute(signal: AbortSignal) {
    const next = getNext()
    // 更新当前执行项的间隔
    intervalTask.updateInterval(next.interval)

    const result = await runWithRetry(
      async () => {
        if (signal.aborted) {
          return Result.fail(new AbortError())
        }
        try {
          const result = await platform.performPopup(next.id, signal)
          if (Result.isSuccess(result)) {
            logger.success(`商品 ${next.id} 讲解成功`)
          }
          return result
        } catch (err) {
          // ⚠️ Playwright 在元素被页面重渲染挤掉时会直接抛异常（而不是返回失败），
          // 而 runWithRetry 内部没有 try/catch —— 不在这里兜住的话异常会一路冒到
          // IntervalTask，任务被直接判定为「错误中断」退出，3 次重试完全不起作用。
          return Result.fail(
            err instanceof Error ? err : new UnexpectedError({ description: String(err) }),
          )
        }
      },
      {
        ...retryOptions,
        logger,
        signal,
        onRetryError: () => {
          const page = platform.getPopupPage()
          if (page) takeScreenshot(page, TASK_NAME, account.name)
        },
      },
    )
    return result
  }

  function getNext(): { id: number; interval: [number, number] } {
    if (plan.length === 0) {
      // 理论上不会发生（validateConfig 已保证非空），兜底避免抛错
      return { id: 0, interval: config.scheduler.interval }
    }

    if (config.random) {
      const infinite = plan.filter(step => !Number.isFinite(step.count))
      if (infinite.length > 0) {
        // 有无限循环商品时，只在它们之间随机
        return infinite[randomInt(0, infinite.length - 1)]
      }
      const total = plan.reduce((sum, step) => sum + step.count, 0)
      let r = randomInt(0, total - 1)
      for (const step of plan) {
        if (r < step.count) return step
        r -= step.count
      }
      return plan[plan.length - 1]
    }

    const step = plan[planIndex]
    usedInStep += 1
    if (usedInStep >= step.count) {
      usedInStep = 0
      planIndex = (planIndex + 1) % plan.length
    }
    return step
  }

  function validateConfig(userConfig: AutoPopupConfig) {
    return Result.pipe(
      intervalTask.validateInterval(userConfig.scheduler.interval),
      Result.andThen(() => {
        const hasItems = userConfig.goodsItems && userConfig.goodsItems.length > 0
        const hasIds = userConfig.goodsIds.length > 0
        if (!hasItems && !hasIds)
          return Result.fail(new Error('商品配置验证失败: 必须提供至少一个商品ID'))
        return Result.succeed()
      }),
      Result.inspect(() => {
        const p = buildPlan(userConfig)
        const finiteTotal = p.reduce(
          (sum, step) => sum + (Number.isFinite(step.count) ? step.count : 0),
          0,
        )
        const infiniteSteps = p.filter(step => !Number.isFinite(step.count))
        logger.info(
          infiniteSteps.length > 0
            ? `商品配置验证通过，共加载 ${finiteTotal} 个弹窗任务，其中 ${infiniteSteps.length} 个商品为无限循环`
            : `商品配置验证通过，共加载 ${finiteTotal} 个弹窗任务`,
        )
        // 无限循环项之后的任务永远不会被执行，提前告知
        const infiniteIndex = p.findIndex(step => !Number.isFinite(step.count))
        if (infiniteIndex >= 0 && infiniteIndex < p.length - 1) {
          logger.warn('无限循环商品之后还有商品，它们将不会被执行（无限循环商品会一直轮到自己）')
        }
      }),
    )
  }

  function updateConfig(newConfig: Partial<AutoPopupConfig>) {
    const mergedConfig = mergeWithoutArray(config, newConfig)
    return Result.pipe(
      validateConfig(mergedConfig),
      Result.andThen(_ => intervalTask.validateInterval(mergedConfig.scheduler.interval)),
      Result.inspect(() => {
        config = mergedConfig
        plan = buildPlan(config)
        planIndex = 0
        usedInStep = 0
        // 更新配置后重新启动任务
        intervalTask.restart()
      }),
      Result.inspectError(err => logger.error('配置更新失败：', err)),
    )
  }

  intervalTask.addStopListener(() => {
    windowManager.send(IPC_CHANNELS.tasks.autoPopUp.stoppedEvent, account.id)
  })

  return Result.pipe(
    validateConfig(config),
    Result.map(_ => ({
      ...intervalTask,
      updateConfig,
    })),
  )
}
