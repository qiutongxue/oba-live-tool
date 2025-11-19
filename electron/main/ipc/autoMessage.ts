import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { errorMessage, typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动发言'
const TASK_TYPE = 'auto-comment'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.autoMessage.start, async (_, accountId, config) => {
    return Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(accountSession =>
        accountSession.startTask({
          type: TASK_TYPE,
          config,
        }),
      ),
      Result.inspectError(error => {
        const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
        logger.error(`启动任务失败：${errorMessage(error)}`)
      }),
      r => r.then(Result.isSuccess),
    )
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoMessage.stop, async (_, accountId) => {
    const accountSession = accountManager.getSession(accountId)
    if (Result.isFailure(accountSession)) {
      const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
      logger.error(`停止任务失败：${errorMessage(accountSession.error)}`)
      return false
    }
    accountSession.value.stopTask(TASK_TYPE)
    return true
  })

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.sendBatchMessages,
    async (_, accountId, messages, count) => {
      return Result.pipe(
        accountManager.getSession(accountId),
        Result.andThen(accountSession =>
          accountSession.startTask({
            type: 'send-batch-messages',
            config: { messages, count },
          }),
        ),
        Result.inspectError(error => {
          const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(
            '一键评论',
          )
          logger.error(`启动任务失败：${errorMessage(error)}`)
        }),
        r => r.then(Result.isSuccess),
      )
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoMessage.updateConfig,
    async (_, accountId, newConfig) => {
      const sessionResult = accountManager.getSession(accountId)
      if (!Result.isSuccess(sessionResult)) {
        return
      }
      const accountSession = sessionResult.value
      accountSession.updateTaskConfig(TASK_TYPE, newConfig)
    },
  )
}

export function setupAutoMessageIpcHandlers() {
  setupIpcHandlers()
}
