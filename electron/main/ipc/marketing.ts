import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '营销工具'
const LOOP_TASK_NAME = '营销循环'
const LOOP_TASK_TYPE = 'marketing-loop'

function logFor(accountId: string) {
  return createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
}

function loopLogFor(accountId: string) {
  return createLogger(`@${accountManager.getAccountName(accountId)}`).scope(LOOP_TASK_NAME)
}

function setupIpcHandlers() {
  // 读取「本场直播福袋」列表（作为可复制的模板）
  typedIpcMainHandle(IPC_CHANNELS.tasks.marketing.getGiftBagTemplates, async (_, accountId) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('读取福袋列表失败：账号未连接')
      return []
    }
    logger.info('正在读取本场直播福袋列表…')
    const result = await session.value.getGiftBagTemplates()
    if (Result.isFailure(result)) {
      logger.error('读取福袋列表失败：', result.error)
      return []
    }
    logger.success(`读取到 ${result.value.length} 个福袋`)
    return result.value
  })

  // 复制指定福袋模板并提交审核
  typedIpcMainHandle(IPC_CHANNELS.tasks.marketing.sendGiftBag, async (_, accountId, params) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('发放福袋失败：账号未连接')
      return false
    }
    logger.info(`正在复制福袋 #${params.index} 并提交审核…`)
    const result = await session.value.sendGiftBag(params.index)
    if (Result.isFailure(result)) {
      logger.error('发放福袋失败：', result.error)
      return false
    }
    logger.success(
      result.value.durationText
        ? `福袋已提交审核（免审规则下将直接发放），表单时长：${result.value.durationText}`
        : '福袋已提交审核（免审规则下将直接发放），未读到表单时长',
    )
    return true
  })

  // 读取「本场直播优惠券」列表
  typedIpcMainHandle(IPC_CHANNELS.tasks.marketing.getCoupons, async (_, accountId) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('读取优惠券列表失败：账号未连接')
      return []
    }
    logger.info('正在读取本场直播优惠券列表…')
    const result = await session.value.getCoupons()
    if (Result.isFailure(result)) {
      logger.error('读取优惠券列表失败：', result.error)
      return []
    }
    logger.success(`读取到 ${result.value.length} 张优惠券`)
    return result.value
  })

  // 发放优惠券
  typedIpcMainHandle(IPC_CHANNELS.tasks.marketing.sendCoupon, async (_, accountId, params) => {
    const logger = logFor(accountId)
    const session = accountManager.getSession(accountId)
    if (Result.isFailure(session)) {
      logger.error('发放优惠券失败：账号未连接')
      return false
    }
    logger.info(
      `正在发放优惠券「${params.couponName}」（数量 ${params.count} / 时长 ${params.duration}）…`,
    )
    const result = await session.value.sendCoupon(params)
    if (Result.isFailure(result)) {
      logger.error('发放优惠券失败：', result.error)
      return false
    }
    logger.success('优惠券已发放')
    return true
  })

  // ==================== 营销循环（状态驱动的自动重发） ====================

  typedIpcMainHandle(IPC_CHANNELS.tasks.marketing.startLoop, async (_, accountId, config) => {
    const logger = loopLogFor(accountId)
    return await Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(accountSession => accountSession.startTask({ type: LOOP_TASK_TYPE, config })),
      Result.inspectError(error => logger.error('启动营销循环失败：', error)),
      r => r.then(Result.isSuccess),
    )
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.marketing.stopLoop, async (_, accountId) => {
    const logger = loopLogFor(accountId)
    return Result.pipe(
      accountManager.getSession(accountId),
      Result.inspect(accountSession => accountSession.stopTask(LOOP_TASK_TYPE)),
      Result.inspectError(error => logger.error('停止营销循环失败：', error)),
      r => Result.isSuccess(r),
    )
  })

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.marketing.updateLoopConfig,
    async (_, accountId, newConfig) => {
      const logger = loopLogFor(accountId)
      Result.pipe(
        accountManager.getSession(accountId),
        Result.andThen(accountSession =>
          accountSession.updateTaskConfig(LOOP_TASK_TYPE, newConfig),
        ),
        Result.inspect(_ => logger.info('更新营销循环配置成功')),
        Result.inspectError(error => logger.error('更新营销循环配置失败：', error)),
      )
    },
  )
}

export function setupMarketingIpcHandlers() {
  setupIpcHandlers()
}
