import { Result } from '@praha/byethrow'
import { ErrorFactory } from '@praha/error-factory'
import { merge } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { AbortError } from '#/errors/AppError'
import type { ScopedLogger } from '#/logger'
import type { IPerformComment } from '#/platforms/IPlatform'
import { insertRandomSpaces, randomInt, replaceVariant, takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import { createIntervalTask } from './IntervalTask'
import { runWithRetry } from './retry'

const TASK_NAME = '自动评论'

const retryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
}

export function createAutoCommentTask(
  platform: IPerformComment,
  taskConfig: AutoCommentConfig,
  account: Account,
  lgr: ScopedLogger,
) {
  const logger = lgr.scope(TASK_NAME)
  let arrayIndex = -1
  let config = { ...taskConfig }

  const intervalTaskResult = createIntervalTask(execute, {
    interval: config.scheduler.interval,
    logger,
    taskName: TASK_NAME,
  })

  if (Result.isFailure(intervalTaskResult)) {
    return intervalTaskResult
  }

  const intervalTask = intervalTaskResult.value

  function getNextMessage() {
    const messages = config.messages

    if (config.random) {
      if (messages.length <= 1) {
        arrayIndex = 0
      } else if (arrayIndex < 0) {
        arrayIndex = randomInt(0, messages.length - 1)
      } else {
        // 不和上一条消息重复
        const nextIndex = randomInt(0, messages.length - 2)
        if (nextIndex < arrayIndex) {
          arrayIndex = nextIndex
        } else {
          arrayIndex = nextIndex + 1
        }
      }
    } else {
      arrayIndex = (arrayIndex + 1) % messages.length
    }
    return messages[arrayIndex]
  }

  function validateConfig(userConfig: AutoCommentConfig): Result.Result<void, Error> {
    const validateMessage = (messages: AutoCommentConfig['messages']) => {
      const isEmptyArray = messages.length === 0
      const overLengthIndex = messages.findIndex(
        msg => msg.content.length > 50 && maxLength(msg.content) > 50,
      )
      const emptyContentIndex = messages.findIndex(msg => msg.content.trim().length === 0)
      if (isEmptyArray) return '必须提供至少一条消息'
      if (overLengthIndex >= 0) return `第 ${overLengthIndex + 1} 条消息字数超出 50 字`
      if (emptyContentIndex >= 0) return `第 ${emptyContentIndex + 1} 条消息为空`
    }

    return Result.pipe(
      // 验证 interval
      intervalTask.validateInterval(userConfig.scheduler.interval),
      // 验证 messages
      Result.andThen(() => {
        const errMsg = validateMessage(userConfig.messages)
        if (errMsg) return Result.fail(new MessageValidationError({ description: errMsg }))
        return Result.succeed()
      }),
      Result.inspect(_ =>
        logger.info(`消息配置验证通过，共加载 ${userConfig.messages.length} 条消息`),
      ),
    )
  }

  async function execute(signal: AbortSignal) {
    const result = await runWithRetry(
      async () => {
        if (signal.aborted) {
          return Result.fail(new AbortError())
        }
        const message = getNextMessage()
        // 替换变量
        let content = replaceVariant(message.content)
        // 添加随机空格
        if (config.extraSpaces) {
          content = insertRandomSpaces(content)
        }
        const pinTop = await platform.performComment(content, message.pinTop)
        if (Result.isFailure(pinTop)) {
          return pinTop
        }
        logger.success(`发送${pinTop.value ? '「置顶」' : ''}消息: ${content}`)
        return Result.succeed()
      },
      {
        ...retryOptions,
        logger,
        signal,
        onRetryError: () => {
          const page = platform.getCommentPage()
          if (page) takeScreenshot(page, TASK_NAME, account.name)
        },
      },
    )
    return result
  }

  function updateConfig(newConfig: Partial<AutoCommentConfig>) {
    const mergedConfig = merge({}, config, newConfig)
    return Result.pipe(
      validateConfig(mergedConfig),
      Result.andThen(_ => intervalTask.validateInterval(mergedConfig.scheduler.interval)),
      Result.inspect(() => {
        config = mergedConfig
        // 更新配置后重新启动任务
        intervalTask.restart()
      }),
      Result.inspectError(err => logger.error('配置更新失败：', err)),
    )
  }

  intervalTask.addStopListener(() => {
    windowManager.send(IPC_CHANNELS.tasks.autoMessage.stoppedEvent, account.id)
  })

  return Result.pipe(
    validateConfig(config),
    Result.map(() => ({
      ...intervalTask,
      updateConfig,
    })),
  )
}

function maxLength(msg: string) {
  let length = 0
  for (let i = 0; i < msg.length; i++) {
    if (msg[i] === '{') {
      const j = msg.indexOf('}', i + 1)
      if (j === -1) {
        // 找不到匹配括号，按正常的字符串长度计算
        length += msg.length - i
        break
      }
      const subLength = msg
        .slice(i + 1, j)
        .split('/')
        .reduce((max, v) => Math.max(max, v.length), 0)
      length += subLength
      i = j
    } else {
      length += 1
    }
  }
  return length
}

class MessageValidationError extends ErrorFactory({
  name: 'MessageValidationError',
  message: ({ description }) => `消息配置验证失败: ${description}`,
  fields: ErrorFactory.fields<{
    description: string
  }>(),
}) {}
