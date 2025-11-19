import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { errorMessage, typedIpcMainHandle } from '#/utils'

const TASK_NAME = '监听评论'
const TASK_TYPE = 'comment-listener'

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.startCommentListener,
    async (_, accountId: string, config: CommentListenerConfig) => {
      return Result.pipe(
        accountManager.getSession(accountId),
        Result.andThen(accountSession =>
          accountSession.startTask({
            type: TASK_TYPE,
            config: config,
          }),
        ),
        Result.inspectError(error => {
          const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(
            TASK_NAME,
          )
          logger.error('启动失败:', errorMessage(error))
        }),
        r => r.then(Result.isSuccess),
      )
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.stopCommentListener,
    async (_, accountId: string) => {
      Result.pipe(
        accountManager.getSession(accountId),
        Result.inspect(accountSession => accountSession.stopTask(TASK_TYPE)),
        Result.inspectError(error => {
          const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(
            TASK_NAME,
          )
          logger.error('停止监听评论失败:', errorMessage(error))
        }),
      )
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoReply.sendReply, async (_, accountId, message) => {
    await Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(accountSession =>
        accountSession.startTask({
          type: 'send-batch-messages',
          config: {
            messages: [message],
            count: 1,
            noSpace: true,
          },
        }),
      ),
      Result.inspectError(error => {
        const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
        logger.error('发送回复失败:', errorMessage(error))
      }),
    )
  })
}

export function setupAutoReplyIpcHandlers() {
  setupIpcHandlers()
}
