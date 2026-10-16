import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { AbortError, UnexpectedError } from '#/errors/AppError'
import type { ScopedLogger } from '#/logger'
import type { IMarketingTool } from '#/platforms/IPlatform'
import { mergeWithoutArray, parseCountdownText, parseDurationText } from '#/utils'
import windowManager from '#/windowManager'
import { createIntervalTask } from './IntervalTask'
import { TaskStopReason } from './ITask'
import { runWithRetry } from './retry'

const TASK_NAME = '营销循环'

/** 比预估结束时间晚一点再去查，避免刚好卡在边界上白跑一趟 */
const CHECK_BUFFER_MS = 5 * 1000
/** 自适应等待的下限，避免频繁开合抽屉 */
const MIN_ADAPTIVE_WAIT_MS = 10 * 1000

/** 毫秒 → 「8分32秒」，用于日志 */
function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`
}

/**
 * 营销循环任务（**状态驱动 + 自适应等待**）。
 *
 * 每发放一次就把「这次会发放多久」记下来（福袋读表单里的时长单选，优惠券用自己配置的时长），
 * 依此算出**预期结束时间**。在那之前循环不会再去开抽屉——因为看了也只会是"发放中"。
 * 等记录的时长过去之后才真正打开弹窗观察能否发放；如果发现仍在发放中，
 * 就退回用户配置的轮询间隔继续检查（页面状态里带倒计时时用倒计时精确等待）。
 *
 * - 福袋：没有任何「发放中」的福袋时才复制并提交指定序号；
 * - 优惠券：目标券不在「发放中」且可用库存 > 0 时才发放；库存为 0 → 记 warn 并结束循环。
 *
 * 与 AutoPopupTask 一样基于 createIntervalTask，停止时通过 IPC 通知渲染层。
 */
export function createMarketingLoopTask(
  platform: IMarketingTool,
  taskConfig: MarketingLoopConfig,
  account: Account,
  _logger: ScopedLogger,
) {
  const logger = _logger.scope(TASK_NAME)
  let config = { ...taskConfig }
  let runCount = 0
  /** 某一轮里判定「该收工了」（例如库存耗尽），由 execute 统一收尾 */
  let shouldFinish = false
  let finishReason: string | null = null

  /**
   * 目标的预期「发放中」结束时间（时间戳）：
   * - `null`  → 状态未知，按配置的轮询间隔检查
   * - 未来时间 → 预计还在发放中，到期前不开抽屉
   * - 过去时间 → 已到期，本轮就该去查一次
   */
  let giftBagEndsAt: number | null = null
  let couponEndsAt: number | null = null

  const intervalTaskResult = createIntervalTask(execute, {
    interval: config.scheduler.interval,
    taskName: TASK_NAME,
    logger,
  })

  if (Result.isFailure(intervalTaskResult)) {
    return intervalTaskResult
  }

  const intervalTask = intervalTaskResult.value

  /** 该目标本轮是否需要真的去读写页面 */
  function isDue(endsAt: number | null): boolean {
    return endsAt === null || Date.now() >= endsAt
  }

  /**
   * 计算下一轮的自适应等待时长。
   *
   * 只要有**已启用**的目标处于「状态未知」，就返回 null（交回配置的轮询间隔）；
   * 否则等到最早那个目标的预期结束时间 + 缓冲。
   */
  function computeAdaptiveWait(): number | null {
    const enabled: number[] = []
    if (config.giftBag?.enabled) enabled.push(giftBagEndsAt ?? Number.NaN)
    if (config.coupon?.enabled) enabled.push(couponEndsAt ?? Number.NaN)
    if (enabled.length === 0) return null

    // 有目标状态未知 → 老老实实按配置的间隔轮询
    if (enabled.some(endsAt => Number.isNaN(endsAt))) return null

    const now = Date.now()
    const pending = enabled.filter(endsAt => endsAt > now)
    if (pending.length === 0) return null

    return Math.max(MIN_ADAPTIVE_WAIT_MS, Math.min(...pending) - now + CHECK_BUFFER_MS)
  }

  async function execute(signal: AbortSignal): Promise<Result.Result<void, Error>> {
    shouldFinish = false
    finishReason = null

    const result = await runWithRetry(
      async () => {
        if (signal.aborted) {
          return Result.fail(new AbortError())
        }
        try {
          return await runOnce(signal)
        } catch (err) {
          return Result.fail(
            err instanceof Error ? err : new UnexpectedError({ description: String(err) }),
          )
        }
      },
      { maxRetries: 3, retryDelay: 2000, logger, signal },
    )

    if (Result.isFailure(result)) {
      // 交给 IntervalTask 以 ERROR 结束任务
      return result
    }

    runCount += 1

    if (shouldFinish) {
      logger.warn(finishReason ?? '已满足结束条件，循环结束')
      intervalTask.stop(TaskStopReason.COMPLETED)
      return Result.succeed()
    }

    const maxRuns = config.maxRuns ?? 0
    if (maxRuns > 0 && runCount >= maxRuns) {
      logger.success(`已执行 ${runCount} 次，达到设定次数，循环结束`)
      intervalTask.stop(TaskStopReason.COMPLETED)
      return Result.succeed()
    }

    // 自适应等待：已知结束时间的目标等它结束再查，否则退回配置的轮询间隔
    const adaptiveWait = computeAdaptiveWait()
    intervalTask.updateInterval(
      adaptiveWait !== null ? [adaptiveWait, adaptiveWait] : config.scheduler.interval,
    )
    if (adaptiveWait !== null) {
      logger.info(`按已记录的发放时长等待 ${formatDuration(adaptiveWait)} 后再检查`)
    }

    return Result.succeed()
  }

  async function runOnce(signal: AbortSignal): Promise<Result.Result<void, Error>> {
    const giftBag = config.giftBag
    const coupon = config.coupon

    if (giftBag?.enabled) {
      if (isDue(giftBagEndsAt)) {
        const giftBagResult = await runGiftBagStep(giftBag, signal)
        if (Result.isFailure(giftBagResult)) return giftBagResult
      } else {
        logger.info(
          `福袋预计还有 ${formatDuration((giftBagEndsAt ?? 0) - Date.now())} 才结束，本轮跳过检查`,
        )
      }
    }

    if (shouldFinish) return Result.succeed()

    if (coupon?.enabled) {
      if (isDue(couponEndsAt)) {
        const couponResult = await runCouponStep(coupon, signal)
        if (Result.isFailure(couponResult)) return couponResult
      } else {
        logger.info(
          `优惠券预计还有 ${formatDuration((couponEndsAt ?? 0) - Date.now())} 才结束，本轮跳过检查`,
        )
      }
    }

    return Result.succeed()
  }

  /** 福袋：没有「发放中」的福袋时才复制并提交，并记录表单里的时长 */
  async function runGiftBagStep(
    cfg: NonNullable<MarketingLoopConfig['giftBag']>,
    signal: AbortSignal,
  ): Promise<Result.Result<void, Error>> {
    const templatesResult = await platform.getGiftBagTemplates()
    if (Result.isFailure(templatesResult)) {
      logger.error('读取福袋列表失败：', templatesResult.error)
      return templatesResult
    }

    const templates = templatesResult.value
    if (templates.length === 0) {
      logger.warn('未读取到福袋模板（可能未开播或列表为空），本次跳过')
      giftBagEndsAt = null
      return Result.succeed()
    }

    const sendingList = templates.filter(t => t.status.includes('发放中'))
    if (sendingList.length > 0) {
      // 状态里可能带倒计时（「发放中 02:31」），有就精确等待，没有就退回轮询
      const countdown = parseCountdownText(sendingList[0].statusText)
      giftBagEndsAt = countdown !== null ? Date.now() + countdown : null
      logger.info(
        `已有 ${sendingList.length} 个福袋正在发放中${
          countdown !== null
            ? `（剩余约 ${formatDuration(countdown)}，已记录）`
            : '，等它结束后再发'
        }`,
      )
      return Result.succeed()
    }

    if (cfg.index < 1 || cfg.index > templates.length) {
      logger.warn(
        `配置的福袋序号 #${cfg.index} 超出范围（当前共 ${templates.length} 个），本次跳过`,
      )
      return Result.succeed()
    }

    logger.info(`当前没有发放中的福袋，开始复制福袋 #${cfg.index} 并提交审核…`)
    const sendResult = await platform.sendGiftBag(cfg.index, signal)
    if (Result.isFailure(sendResult)) {
      logger.error('发放福袋失败：', sendResult.error)
      giftBagEndsAt = null
      return sendResult
    }

    const { durationText, durationMs } = sendResult.value
    giftBagEndsAt = durationMs !== null ? Date.now() + durationMs : null
    logger.success(
      durationMs !== null
        ? `福袋 #${cfg.index} 已提交；已记录表单时长 ${durationText}，${formatDuration(
            durationMs,
          )} 后再检查`
        : `福袋 #${cfg.index} 已提交（未读到表单时长，将按轮询间隔检查）`,
    )
    return Result.succeed()
  }

  /** 优惠券：目标券不在「发放中」且还有库存时才自动发放，并记录发券时长 */
  async function runCouponStep(
    cfg: NonNullable<MarketingLoopConfig['coupon']>,
    signal: AbortSignal,
  ): Promise<Result.Result<void, Error>> {
    const couponName = cfg.params.couponName

    const couponsResult = await platform.getCoupons()
    if (Result.isFailure(couponsResult)) {
      logger.error('读取优惠券列表失败：', couponsResult.error)
      return couponsResult
    }

    const target = couponsResult.value.find(c => c.name === couponName)
    if (!target) {
      logger.warn(`未在列表中找到优惠券「${couponName}」，本次跳过`)
      couponEndsAt = null
      return Result.succeed()
    }

    if (target.sending) {
      // 优惠券状态文本本身就带倒计时（如「发放中 03:31」），用它精确等待
      const countdown = parseCountdownText(target.status)
      couponEndsAt = countdown !== null ? Date.now() + countdown : null
      logger.info(
        `优惠券「${target.name}」正在发放中（${target.status}）${
          countdown !== null
            ? `，剩余约 ${formatDuration(countdown)}，已记录`
            : '，等它结束后自动重发'
        }`,
      )
      return Result.succeed()
    }

    const stock = parseStock(target.availableStock)
    if (stock !== null && stock <= 0) {
      shouldFinish = true
      finishReason = `优惠券「${target.name}」可用库存已为 0，循环停止（补充库存后可重新启动）`
      return Result.succeed()
    }

    logger.info(
      `优惠券「${target.name}」已停止发放，正在自动发放（数量 ${cfg.params.count} / 时长 ${cfg.params.duration}）…`,
    )
    // 循环的闸门已经保证「不在发放中」，这里不需要先停止
    const sendResult = await platform.sendCoupon({ ...cfg.params, restop: false }, signal)
    if (Result.isFailure(sendResult)) {
      logger.error('发放优惠券失败：', sendResult.error)
      couponEndsAt = null
      return sendResult
    }

    // 时长就是我们自己选的那个，直接记录
    const durationMs = parseDurationText(cfg.params.duration)
    couponEndsAt = durationMs !== null ? Date.now() + durationMs : null
    logger.success(
      durationMs !== null
        ? `优惠券「${target.name}」已发放；已记录时长 ${cfg.params.duration}，${formatDuration(
            durationMs,
          )} 后再检查`
        : `优惠券「${target.name}」已发放（时长无法解析，将按轮询间隔检查）`,
    )
    return Result.succeed()
  }

  function validateConfig(userConfig: MarketingLoopConfig): Result.Result<void, Error> {
    return Result.pipe(
      intervalTask.validateInterval(userConfig.scheduler.interval),
      Result.andThen(() => {
        const giftBagEnabled = Boolean(userConfig.giftBag?.enabled)
        const couponEnabled = Boolean(userConfig.coupon?.enabled)
        if (!giftBagEnabled && !couponEnabled) {
          return Result.fail(new Error('必须至少启用「福袋循环」或「优惠券循环」中的一个'))
        }
        if (giftBagEnabled && (userConfig.giftBag?.index ?? 0) < 1) {
          return Result.fail(new Error('福袋序号必须为 1 或更大'))
        }
        if (couponEnabled && !userConfig.coupon?.params?.couponName) {
          return Result.fail(new Error('未指定要循环发放的优惠券'))
        }
        return Result.succeed()
      }),
      Result.inspect(() => {
        const parts: string[] = []
        if (userConfig.giftBag?.enabled) parts.push(`福袋 #${userConfig.giftBag.index}`)
        if (userConfig.coupon?.enabled) {
          parts.push(`优惠券「${userConfig.coupon.params.couponName}」`)
        }
        const maxRuns = userConfig.maxRuns ?? 0
        logger.info(
          `营销循环配置验证通过：${parts.join(' + ')}，${
            maxRuns > 0 ? `最多执行 ${maxRuns} 次` : '无限循环'
          }`,
        )
      }),
    )
  }

  function updateConfig(newConfig: Partial<MarketingLoopConfig>): Result.Result<void, Error> {
    const mergedConfig = mergeWithoutArray(config, newConfig)
    return Result.pipe(
      validateConfig(mergedConfig),
      Result.inspect(() => {
        config = mergedConfig
        runCount = 0
        // 目标可能变了，之前记录的结束时间作废
        giftBagEndsAt = null
        couponEndsAt = null
        intervalTask.restart()
      }),
      Result.inspectError(err => logger.error('配置更新失败：', err)),
    )
  }

  intervalTask.addStopListener(() => {
    windowManager.send(IPC_CHANNELS.tasks.marketing.loopStoppedEvent, account.id)
  })

  return Result.pipe(
    validateConfig(config),
    Result.map(_ => ({
      ...intervalTask,
      updateConfig,
    })),
  )
}

/** 从「588张」这类文本里取出数字，取不到则返回 null */
function parseStock(text: string): number | null {
  const matched = text.replace(/[,\s]/g, '').match(/(\d+)/)
  return matched ? Number(matched[1]) : null
}
