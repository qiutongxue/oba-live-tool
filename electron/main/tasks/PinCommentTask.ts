import { Result } from '@praha/byethrow'
import type { ScopedLogger } from '#/logger'
import type { IPinComment } from '#/platforms/IPlatform'
import { createTask } from './BaseTask'
import { type ITask, TaskStopReason } from './ITask'

const TASK_NAME = '评论上墙'
const TIMEOUT = 10 * 1000 // 上墙间隔最少为 10 秒
const runningTasks = new Map<string, PinCommentTask>()

interface PinCommentTask extends ITask {
  setComment: (newComment: string) => void
}

export const createPinCommentTask = (
  platform: IPinComment,
  _comment: string,
  accountId: string,
  _logger: ScopedLogger,
): Result.Result<PinCommentTask, Error> => {
  if (runningTasks.has(accountId)) {
    // biome-ignore lint/style/noNonNullAssertion: 用 has 判断过了
    const task = runningTasks.get(accountId)!
    task.setComment(_comment)
    return Result.succeed(task)
  }
  const logger = _logger.scope(TASK_NAME)
  let timer: ReturnType<typeof setTimeout> | null = null
  let comment: string | null = _comment
  async function poll() {
    if (!comment || timer) {
      // 主动结束任务，方便下次调用
      task.stop(TaskStopReason.MANUAL)
      return
    }
    const temp = comment
    comment = null
    try {
      const result = await platform.pinComment(temp)
      if (Result.isFailure(result)) {
        throw result.error
      }
      logger.info(`评论「${temp}」上墙成功`)
    } catch (err) {
      logger.error('评论上墙失败', err)
    }
    timer = setTimeout(() => {
      timer = null
      poll()
    }, TIMEOUT)
  }

  const baseTask = createTask(
    {
      logger,
      taskName: TASK_NAME,
    },
    {
      onStart: () => {
        runningTasks.set(accountId, task)
        poll()
      },
      onStop: () => {
        runningTasks.delete(accountId)
        timer && clearTimeout(timer)
      },
    },
  )
  const task = {
    ...baseTask,
    setComment: (newComment: string) => {
      comment = newComment
    },
  }
  return Result.succeed(task)
}
