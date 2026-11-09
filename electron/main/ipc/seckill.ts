import { Result } from '@praha/byethrow'
import { app } from 'electron'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import {
  getFloatMode,
  hideFloatWindow,
  notifySoldOut,
  setFloatMode,
  showFloatWindow,
} from '#/floatWindow'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '秒杀补货'

function logFor(accountId: string) {
  return createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
}

export function setupSeckillIpcHandlers() {
  // 读取「直播商品」列表
  typedIpcMainHandle(IPC_CHANNELS.seckill.read, async (_, accountId) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('读取货架失败：账号未连接')
      return []
    }
    logger.info('正在读取直播商品列表…')
    const result = await session.value.readSeckillGoods()
    if (Result.isFailure(result)) {
      logger.error('读取货架失败：', result.error)
      return []
    }
    const soldOut = result.value.filter(g => g.soldOut).length
    logger.success(`读取到 ${result.value.length} 个商品，其中售罄 ${soldOut} 个`)
    return result.value
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

  // 售罄监控：只在「售罄自动弹出」模式下运行，30 秒看一次货架
  typedIpcMainHandle(IPC_CHANNELS.seckill.setFloatMode, (_, accountId, mode) => {
    setFloatMode(mode)
    if (mode === 'auto') startSoldOutWatch(accountId)
    else stopSoldOutWatch()
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
}

// ==================== 售罄监控（自动弹出悬浮窗） ====================

const WATCH_INTERVAL_MS = 30 * 1000
let watchTimer: ReturnType<typeof setInterval> | null = null
let watchAccountId: string | null = null

function stopSoldOutWatch() {
  if (watchTimer) clearInterval(watchTimer)
  watchTimer = null
  watchAccountId = null
}

function startSoldOutWatch(accountId: string) {
  if (watchTimer && watchAccountId === accountId) return
  stopSoldOutWatch()
  watchAccountId = accountId
  watchTimer = setInterval(() => {
    void (async () => {
      if (getFloatMode() !== 'auto') return
      const session = accountManager.getSession(accountId)
      if (Result.isFailure(session)) return
      const result = await session.value.readSeckillGoods()
      if (Result.isSuccess(result) && result.value.some(item => item.soldOut)) {
        notifySoldOut()
      }
    })()
  }, WATCH_INTERVAL_MS)
}

/** 应用启动时先注册快捷键（默认「快捷键唤出」模式） */
export function initSeckillShortcut() {
  // 本模块在 app ready 之前就被 import，globalShortcut 必须等 ready 之后才能用
  const register = () => setFloatMode('shortcut')
  if (app.isReady()) register()
  else void app.whenReady().then(register)
}
