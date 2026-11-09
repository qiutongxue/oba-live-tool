import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '评论滚动'
const TASK_TYPE = 'comment-scroll'

function logFor(accountId: string) {
  return createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
}

/**
 * 「评论列表自动滚动」任务：让中控台「评论管理」里的列表持续跟随最新弹幕。
 */
export function setupCommentScrollIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.commentScroll.start, async (_, accountId, config) => {
    const logger = logFor(accountId)
    return await Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(session => session.startTask({ type: TASK_TYPE, config })),
      Result.inspectError(error => logger.error('启动评论滚动失败：', error)),
      r => r.then(Result.isSuccess),
    )
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.commentScroll.stop, async (_, accountId) => {
    const logger = logFor(accountId)
    return Result.pipe(
      accountManager.getSession(accountId),
      Result.inspect(session => session.stopTask(TASK_TYPE)),
      Result.inspectError(error => logger.error('停止评论滚动失败：', error)),
      r => Result.isSuccess(r),
    )
  })
}
