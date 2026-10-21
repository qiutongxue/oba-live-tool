import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import type { ScopedLogger } from '#/logger'
import type { IPlatform, IScrollComments } from '#/platforms/IPlatform'
import { randomInt } from '#/utils'
import windowManager from '#/windowManager'
import { createTask } from './BaseTask'
import type { ITask } from './ITask'

const TASK_NAME = '评论滚动'

/** 默认间隔：2.5~4 秒滚一次，够跟上弹幕速度，又不至于太频繁 */
const DEFAULT_INTERVAL: [number, number] = [2500, 4000]
/** 间隔下限，防止配置成 0 变成死循环 */
const MIN_INTERVAL_MS = 1000

/**
 * 评论列表自动滚动任务。
 *
 * 作用很单一：每隔几秒把中控台「评论管理」里的消息列表滚到底部，
 * 这样即使页面自己停止了自动跟随，也始终能看到最新弹幕。
 *
 * 几个刻意的设计：
 * - **不用 IntervalTask**：它每轮都会打一条「任务将在 X 秒后继续执行」的日志，
 *   3 秒一次会把日志刷爆；这里自己用 setTimeout 调度，只在异常/恢复时打日志。
 * - **失败不立即中断**：页面重渲染、抽屉遮挡、恰好没渲染出来都会导致本次找不到列表，
 *   这类情况下一轮自然就好了，所以只累计并降频记录；连续失败太多次才判定任务出错。
 * - **滚动本身走 pageLock**：和其他任务的点击/输入串行，避免把正在点击的元素挤走。
 */
export function createCommentScrollTask(
  platform: IPlatform & IScrollComments,
  taskConfig: CommentScrollConfig,
  account: Account,
  _logger: ScopedLogger,
): Result.Result<ITask, Error> {
  const logger = _logger.scope(TASK_NAME)
  const [min, max] = normalizeInterval(taskConfig.interval)

  let timer: ReturnType<typeof setTimeout> | null = null
  let active = false
  /** 连续「没找到列表 / 滚动失败」的次数 */
  let missCount = 0
  /** 是否已经打过「接上列表」的成功日志（只打一次） */
  let firstSuccessLogged = false

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const scheduleNext = () => {
    if (!active) return
    clearTimer()
    timer = setTimeout(() => void tick(), randomInt(min, max))
  }

  async function tick() {
    if (!active) return

    try {
      const result = await platform.scrollCommentsToBottom()
      if (Result.isFailure(result)) {
        missCount += 1
        // 只在前几次和每 30 次时提示，避免刷屏
        if (missCount <= 3 || missCount % 30 === 0) {
          logger.warn(`滚动评论列表失败（连续第 ${missCount} 次），稍后继续重试：`, result.error)
        }
      } else if (result.value.status === 'scrolled' || result.value.status === 'already-bottom') {
        const report = result.value
        if (!firstSuccessLogged) {
          // 只在第一次成功时打一条，便于确认"确实接上了"，之后不再刷屏
          firstSuccessLogged = true
          logger.success(
            `已接上评论列表（定位=${report.via}｜容器=${report.target}），后续会持续跟随最新消息`,
          )
        }
        if (missCount > 0) {
          logger.info('评论列表滚动已恢复正常')
          missCount = 0
        }
      } else {
        // no-title / no-scrollable：页面可能正在切换、重渲染或不在中控台
        missCount += 1
        if (missCount <= 3 || missCount % 30 === 0) {
          const report = result.value
          logger.warn(
            `暂时没找到「评论管理」列表（第 ${missCount} 次：${report.status}｜` +
              `定位=${report.via}｜候选=${report.candidates}｜选中=${report.target || '无'}），稍后重试`,
          )
        }
      }
    } catch (err) {
      missCount += 1
      if (missCount <= 3) {
        logger.warn('滚动评论列表时出现异常，稍后重试：', err)
      }
    }

    scheduleNext()
  }

  const task = createTask(
    { taskName: TASK_NAME, logger },
    {
      onStart: () => {
        active = true
        missCount = 0
        firstSuccessLogged = false
        logger.info(`评论列表自动滚动已启动（每 ${min / 1000}~${max / 1000} 秒滚动一次）`)
        void tick()
      },
      onStop: () => {
        active = false
        clearTimer()
      },
    },
  )

  // 任务结束（手动停止 / 出错 / 账号断开）时通知渲染层复位开关
  task.addStopListener(() => {
    windowManager.send(IPC_CHANNELS.tasks.commentScroll.stoppedEvent, account.id)
  })

  return Result.succeed(task)
}

/** 把配置里的区间规整成合法的 [min, max] */
function normalizeInterval(interval?: [number, number]): [number, number] {
  if (!interval) return DEFAULT_INTERVAL
  const values = interval
    .map(v => (Number.isFinite(v) ? Math.floor(v) : Number.NaN))
    .filter(v => !Number.isNaN(v))
  if (values.length !== 2) return DEFAULT_INTERVAL
  const lo = Math.max(MIN_INTERVAL_MS, Math.min(...values))
  const hi = Math.max(MIN_INTERVAL_MS, Math.max(...values))
  return [lo, hi]
}
