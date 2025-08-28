import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager2'
import { errorMessage, typedIpcMainHandle } from '#/utils'

const TASK_NAME = '监听评论'
const TASK_TYPE = 'comment-listener'

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.startCommentListener,
    async (_, accountId: string, config: CommentListenerConfig) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        accountSession.startTask({
          type: TASK_TYPE,
          config: config,
        })
        return true
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} @${accountManager.getAccountName(accountId)}`,
        )
        logger.error('启动失败:', error)
        return false
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.stopCommentListener,
    async (_, accountId: string) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        accountSession.stopTask('comment-listener')
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} @${accountManager.getAccountName(accountId)}`,
        )

        logger.error('停止监听评论失败:', errorMessage(error))
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReply.sendReply,
    async (_, accountId, message) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        // TODO: 也许不应该用这个批量发送任务？还有发送消息成功的 logger 怎么解决（包括自动评论）？
        accountSession.startTask({
          type: 'send-batch-messages',
          config: {
            messages: [message],
            count: 1,
            noSpace: true,
          },
        })
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} @${accountManager.getAccountName(accountId)}`,
        )
        logger.error('发送回复失败:', errorMessage(error))
        throw error
      }
    },
  )
}

export function setupAutoReplyIpcHandlers() {
  setupIpcHandlers()
}
