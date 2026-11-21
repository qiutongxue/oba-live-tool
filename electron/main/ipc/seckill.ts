import { Result } from '@praha/byethrow'
import { app } from 'electron'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { emitter } from '#/event/eventBus'
import {
  getFloatMode,
  hideFloatWindow,
  notifySoldOut,
  onFloatPendingCount,
  resetSoldOutState,
  resizeFloatWindow,
  setFloatMode,
  showFloatWindow,
  updateFloatGoods,
} from '#/floatWindow'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'
import windowManager from '#/windowManager'

const TASK_NAME = '秒杀补货'

function logFor(accountId: string) {
  return createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
}

export function setupSeckillIpcHandlers() {
  // 读取「直播商品」列表。ok=false 表示这次没读出来（页面/连接异常），
  // 界面据此保留上一次的结果，不能把空数组当成「没有售罄商品」。
  typedIpcMainHandle(IPC_CHANNELS.seckill.read, async (_, accountId) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('读取货架失败：账号未连接')
      return { goods: [], ok: false }
    }
    logger.info('正在读取直播商品列表…')
    const result = await session.value.readSeckillGoods()
    if (Result.isFailure(result)) {
      logger.error('读取货架失败：', result.error)
      return { goods: [], ok: false }
    }
    const soldOut = result.value.filter(g => g.soldOut).length
    logger.success(`读取到 ${result.value.length} 个商品，其中售罄 ${soldOut} 个`)
    return { goods: result.value, ok: true }
  })

  // 对指定商品补货（投放库存 = 当前值 + addCount）
  typedIpcMainHandle(
    IPC_CHANNELS.seckill.restock,
    async (_, accountId, index, addCount, manualEntry) => {
      const logger = logFor(accountId)
      const session = accountManager.getSession(accountId)
      if (Result.isFailure(session)) {
        logger.error('补货失败：账号未连接')
        return null
      }
      logger.info(
        `正在给第 ${index} 个商品补货：投放库存 +${addCount}${manualEntry ? '（手动打开弹窗）' : ''}…`,
      )
      const result = await session.value.restockSeckill(index, addCount, manualEntry)
      if (Result.isFailure(result)) {
        logger.error('补货失败：', result.error)
        return null
      }
      const r = result.value
      const timing = `（打开弹窗 ${r.timings.openModalMs}ms｜读库存 ${r.timings.readStockMs}ms｜提交 ${r.timings.submitMs}ms｜复核 ${r.timings.verifyMs}ms）`
      if (r.verified || r.closed) {
        logger.success(
          r.verified
            ? `${r.title} 补货成功：投放库存 ${r.before} → ${r.next}，剩余 ${r.afterStock}${timing}`
            : `${r.title} 补货已提交：投放库存 ${r.before} → ${r.next}（列表未刷新）${timing}`,
        )
      } else {
        logger.warn(`${r.title} 补货结果待确认：${r.message}${timing}`)
      }
      return r
    },
  )

  // 导出页面结构（定位失败时排查用）
  typedIpcMainHandle(IPC_CHANNELS.seckill.dump, async (_, accountId) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('导出结构失败：账号未连接')
      return ''
    }
    const result = await session.value.dumpSeckillDom()
    if (Result.isFailure(result)) {
      logger.error('导出结构失败：', result.error)
      return ''
    }
    logger.info(`页面结构已导出（${result.value.length} 字符）：\n${result.value}`)
    return result.value
  })

  // 打开方式：只在「售罄自动弹出」模式下弹窗，快捷键模式下静默提醒
  typedIpcMainHandle(IPC_CHANNELS.seckill.setFloatMode, (_, _accountId, mode) => {
    // 打开方式只管「售罄时弹不弹窗」，监控是否运行由模块开关决定
    setFloatMode(mode)
  })

  // 模块总开关：开启后每 30 秒巡一次货架
  typedIpcMainHandle(IPC_CHANNELS.seckill.start, (_, accountId) => {
    logFor(accountId).success('已开启秒杀补货监控')
    startSoldOutWatch(accountId)
  })

  typedIpcMainHandle(IPC_CHANNELS.seckill.stop, (_, accountId) => {
    logFor(accountId).info('已停止秒杀补货监控')
    stopSoldOutWatch()
  })

  // 录制用户的一次真实点击：点完把目标链写进日志，供分析选择器
  typedIpcMainHandle(IPC_CHANNELS.seckill.recordClick, async (_, accountId) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('录制失败：账号未连接')
      return ''
    }
    logger.info('开始录制点击：请在页面上点一次目标元素（90 秒内有效）…')
    const result = await session.value.recordSeckillClick()
    if (Result.isFailure(result)) {
      logger.error('录制失败：', result.error)
      return ''
    }
    logger.info(`录制结果：\n${result.value}`)
    return result.value
  })

  typedIpcMainHandle(IPC_CHANNELS.seckill.openFloat, () => showFloatWindow())
  typedIpcMainHandle(IPC_CHANNELS.seckill.closeFloat, () => hideFloatWindow())
  // 浮窗内容撑多高，窗口就多高
  typedIpcMainHandle(IPC_CHANNELS.seckill.setFloatHeight, (_, height) => resizeFloatWindow(height))
  // 待补数量归零 → 自动弹出的浮窗自己关掉，回到后台继续监听。
  // 关窗条件：见过待补商品 + 本次是成功读取 + 停留超过 0.8 秒。
  // 读取失败时 ok=false，绝不关窗（否则一次读失败就表现为「弹一下就消失」）。
  typedIpcMainHandle(IPC_CHANNELS.seckill.reportFloatCount, (_, count, ok) => {
    const closed = onFloatPendingCount(count, ok)
    if (closed && watchAccountId) logFor(watchAccountId).info('补货窗已自动关闭（货架已无售罄）')
  })

  // 断开中控台时把监控一起停掉（其他模块靠任务体系自动停，秒杀是自己起的定时器）
  emitter.on('account-disconnected', ({ accountId }) => {
    if (watchAccountId !== accountId) return
    stopSoldOutWatch(true)
  })
}

// ==================== 售罄监控（自动弹出悬浮窗） ====================

/** 巡检间隔：10 秒一次，售罄后能更快弹窗；页面读取本身有互斥锁，不会和补货打架 */
const WATCH_INTERVAL_MS = 10 * 1000
let watchTimer: ReturnType<typeof setInterval> | null = null
let watchAccountId: string | null = null
/** 上次只记过日志的售罄签名（快捷键模式下不重复刷屏） */
let lastLoggedKey = ''

/** 停止巡检；`notifyRenderer` 为 true 时通知界面把绿点去掉 */
function stopSoldOutWatch(notifyRenderer = false) {
  const stoppedAccountId = watchAccountId
  if (watchTimer) clearInterval(watchTimer)
  watchTimer = null
  watchAccountId = null
  lastLoggedKey = ''
  resetSoldOutState()
  if (notifyRenderer && stoppedAccountId) {
    logFor(stoppedAccountId).warn('已停止秒杀补货监控（连接已断开）')
    windowManager.send(IPC_CHANNELS.seckill.stoppedEvent, stoppedAccountId)
  }
}

function startSoldOutWatch(accountId: string) {
  if (watchTimer && watchAccountId === accountId) return
  stopSoldOutWatch()
  watchAccountId = accountId

  // 开启后立刻巡一次，不用干等 30 秒
  void tickSoldOutWatch(accountId)
  watchTimer = setInterval(() => void tickSoldOutWatch(accountId), WATCH_INTERVAL_MS)
}

async function tickSoldOutWatch(accountId: string) {
  const session = accountManager.getSession(accountId)
  if (Result.isFailure(session)) return

  const result = await session.value.readSeckillGoods()
  if (Result.isFailure(result)) return

  const goods = result.value
  // 窗口开着时把最新货架推过去，页面不再自己读，避免两边数据不一致
  updateFloatGoods(goods)

  const soldOut = goods.filter(item => item.soldOut)
  if (soldOut.length === 0) {
    // 都补上了：清掉签名，下次真售罄还能正常弹
    resetSoldOutState()
    lastLoggedKey = ''
    return
  }

  // 同一批售罄商品只提醒一次；补完一个又售罄另一个时签名会变，重新提醒
  const key = soldOut
    .map(item => `${item.index}:${item.title}`)
    .sort()
    .join('|')

  if (key !== lastLoggedKey) {
    lastLoggedKey = key
    logFor(accountId).info(
      getFloatMode() === 'auto'
        ? `检测到 ${soldOut.length} 个商品售罄，弹出补货窗`
        : `检测到 ${soldOut.length} 个商品售罄（Ctrl+Shift+B 可打开补货窗）`,
    )
  }
  notifySoldOut(key, goods)
}

/** 应用启动时先注册快捷键（默认「快捷键唤出」模式） */
export function initSeckillShortcut() {
  // 本模块在 app ready 之前就被 import，globalShortcut 必须等 ready 之后才能用
  const register = () => setFloatMode('shortcut')
  if (app.isReady()) register()
  else void app.whenReady().then(register)
}
