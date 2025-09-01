import { IPC_CHANNELS } from 'shared/ipcChannels'
import type { ScopedLogger } from '#/logger'
import type { IPerformComment } from '#/platforms/IPlatform'
import {
  insertRandomSpaces,
  randomInt,
  replaceVariant,
  takeScreenshot,
} from '#/utils'
import windowManager from '#/windowManager'
import { IntervalTask } from './IntervalTask'
import { runWithRetry } from './retry'

const TASK_NAME = '自动评论'

const retryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
}

export class AutoCommentTask extends IntervalTask<AutoCommentConfig> {
  private arrayIndex = -1
  constructor(
    protected platform: IPerformComment,
    private config: AutoCommentConfig,
    private account: Account,
    logger: ScopedLogger,
  ) {
    super({
      taskName: TASK_NAME,
      logger,
      interval: config.scheduler.interval,
    })
    this.validateConfig(config)
  }

  protected async execute(): Promise<void> {
    try {
      runWithRetry(
        async () => {
          const message = this.getNextMessage()
          // 替换变量
          let content = replaceVariant(message.content)
          // 添加随机空格
          if (this.config.extraSpaces) {
            content = insertRandomSpaces(content)
          }
          const isPinTop = await this.platform.performComment(
            content,
            message.pinTop,
          )
          this.logger.success(
            `发送${isPinTop ? '「置顶」' : ''}消息: ${content}`,
          )
        },
        {
          ...retryOptions,
          logger: this.logger,
          onRetryError: () =>
            takeScreenshot(
              this.platform.getCommentPage(),
              TASK_NAME,
              this.account.name,
            ),
        },
      )
    } catch (err) {
      windowManager.send(
        IPC_CHANNELS.tasks.autoMessage.stoppedEvent,
        this.account.id,
      )
      throw err
    }
  }

  private getNextMessage() {
    const messages = this.config.messages

    if (this.config.random) {
      if (messages.length <= 1) {
        this.arrayIndex = 0
      } else if (this.arrayIndex < 0) {
        this.arrayIndex = randomInt(0, messages.length - 1)
      } else {
        // 不和上一条消息重复
        const nextIndex = randomInt(0, messages.length - 2)
        if (nextIndex < this.arrayIndex) {
          this.arrayIndex = nextIndex
        } else {
          this.arrayIndex = nextIndex + 1
        }
      }
    } else {
      this.arrayIndex = (this.arrayIndex + 1) % messages.length
    }
    return messages[this.arrayIndex]
  }

  private validateConfig(userConfig: AutoCommentConfig) {
    super.validateInterval(userConfig.scheduler.interval)
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

    this.logger.info(
      `消息配置验证通过，共加载 ${userConfig.messages.length} 条消息`,
    )
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
