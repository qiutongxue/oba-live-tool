import { Result } from '@praha/byethrow'
import type { BatchAccountResult } from 'shared/electron-api'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动发言'
const TASK_TYPE = 'auto-comment'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.autoMessage.start, async (_, accountId, config) => {
    return Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(accountSession => accountSession.startTask({ type: TASK_TYPE, config })),
      Result.inspectError(error => {
        const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
        logger.error('启动任务失败：', error)
      }),
      r => r.then(Result.isSuccess),
    )
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoMessage.stop, async (_, accountId) => {
    return Result.pipe(
      accountManager.getSession(accountId),
      Result.inspect(accountSession => accountSession.stopTask(TASK_TYPE)),
      Result.inspectError(error => {
        const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
        logger.error('停止任务失败：', error)
      }),
      r => Result.isSuccess(r),
    )
  })

  /** 批量启动自动发言：每个账号使用各自独立的会话与配置 */
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.startForAccounts,
    async (_, accountIds, config) => {
      const results: BatchAccountResult[] = []
      for (const accountId of accountIds) {
        const outcome = await Result.pipe(
          accountManager.getSession(accountId),
          Result.andThen(accountSession =>
            accountSession.startTask({ type: TASK_TYPE, config }),
          ),
        )
        const result = Result.isSuccess(outcome)
        if (!result) {
          const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(
            TASK_NAME,
          )
          logger.error('批量启动任务失败：', Result.unwrapError(outcome))
        }
        results.push({ accountId, success: result })
      }
      return results
    },
  )

  /** 批量停止自动发言 */
  typedIpcMainHandle(IPC_CHANNELS.tasks.autoMessage.stopForAccounts, async (_, accountIds) => {
    return accountIds.map(accountId => {
      const result = Result.pipe(
        accountManager.getSession(accountId),
        Result.inspect(accountSession => accountSession.stopTask(TASK_TYPE)),
        r => Result.isSuccess(r),
      )
      return { accountId, success: result }
    })
  })

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.sendBatchMessages,
    async (_, accountId, messages, count) => {
      return Result.pipe(
        accountManager.getSession(accountId),
        Result.andThen(accountSession =>
          accountSession.startTask({ type: 'send-batch-messages', config: { messages, count } }),
        ),
        Result.inspectError(error => {
          const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(
            '一键评论',
          )
          logger.error('启动任务失败：', error)
        }),
        r => r.then(Result.isSuccess),
      )
    },
  )

  /** 批量一键刷屏：每个账号在各自直播间独立执行 */
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.sendBatchMessagesForAccounts,
    async (_, accountIds, messages, count) => {
      const results: BatchAccountResult[] = []
      for (const accountId of accountIds) {
        const outcome = await Result.pipe(
          accountManager.getSession(accountId),
          Result.andThen(accountSession =>
            accountSession.startTask({ type: 'send-batch-messages', config: { messages, count } }),
          ),
        )
        const result = Result.isSuccess(outcome)
        if (!result) {
          const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope('一键评论')
          logger.error('批量一键刷屏失败：', Result.unwrapError(outcome))
        }
        results.push({ accountId, success: result })
      }
      return results
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.updateConfig,
    async (_, accountId, newConfig) => {
      const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
      Result.pipe(
        accountManager.getSession(accountId),
        Result.andThen(accountSession => accountSession.updateTaskConfig(TASK_TYPE, newConfig)),
        Result.inspect(_ => logger.info('更新配置成功')),
        Result.inspectError(error => logger.error('更新配置失败：', error)),
      )
    },
  )
}

export function setupAutoMessageIpcHandlers() {
  setupIpcHandlers()
}
