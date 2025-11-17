import { Result } from '@praha/byethrow'
import { merge } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { AbortError, UnexpectedError } from '#/errors/AppError'
import type { ScopedLogger } from '#/logger'
import type { IPerformComment } from '#/platforms/IPlatform'
import {
  errorMessage,
  insertRandomSpaces,
  randomInt,
  replaceVariant,
  takeScreenshot,
} from '#/utils'
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

  function validateConfig(userConfig: AutoCommentConfig) {
    intervalTask.validateInterval(userConfig.scheduler.interval)
    if (userConfig.messages.length === 0) {
      throw new Error('消息配置验证失败: 必须提供至少一条消息')
    }

    const badIndex = userConfig.messages.findIndex(
      msg => msg.content.length > 50 && maxLength(msg.content) > 50,
    )
    if (badIndex >= 0) {
      throw new Error(
        `消息配置验证失败: 第 ${badIndex + 1} 条消息字数超出 50 字`,
      )
    }
    const emptyMessageIndex = userConfig.messages.findIndex(
      msg => msg.content.trim().length === 0,
    )
    if (emptyMessageIndex >= 0) {
      throw new Error(`消息配置验证失败: 第 ${badIndex + 1} 条消息为空`)
    }

    logger.info(`消息配置验证通过，共加载 ${userConfig.messages.length} 条消息`)
  }

  const execute = async (signal: AbortSignal) => {
    try {
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
          return Result.pipe(
            platform.performComment(content, message.pinTop),
            Result.inspect(isPinTop => {
              logger.success(
                `发送${isPinTop ? '「置顶」' : ''}消息: ${content}`,
              )
            }),
            Result.map(_ => void 0),
          )
        },
        {
          ...retryOptions,
          logger,
          onRetryError: () => {
            Result.pipe(
              platform.getCommentPage(),
              Result.map(page => takeScreenshot(page, TASK_NAME, account.name)),
            )
          },
        },
      )
      if (Result.isFailure(result)) {
        windowManager.send(
          IPC_CHANNELS.tasks.autoMessage.stoppedEvent,
          account.id,
        )
      }
      return result
    } catch (error) {
      return Result.fail(new UnexpectedError({ cause: error }))
    }
  }

  const intervalTask = createIntervalTask(execute, {
    interval: config.scheduler.interval,
    logger,
    taskName: TASK_NAME,
  })

  validateConfig(config)

  return {
    ...intervalTask,
    updateConfig(newConfig: Partial<AutoCommentConfig>) {
      try {
        const mergedConfig = merge({}, config, newConfig)
        validateConfig(mergedConfig)
        if (newConfig.scheduler?.interval) {
          intervalTask.updateInterval(config.scheduler.interval)
        }
        config = mergedConfig
      } catch (error) {
        logger.error(`配置更新失败: ${errorMessage(error)}`)
        throw error
      }
    },
  }
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
