import { merge } from 'lodash-es'
import type { Page } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import type { Account } from '#/taskManager'
import { LiveController } from '#/tasks/controller/LiveController'
import { insertRandomSpaces, randomInt, sleep, takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import type { BaseConfig } from './scheduler'
import { TaskScheduler } from './scheduler'

const TASK_NAME = '自动发言'

interface Message {
  id: string
  content: string
  pinTop: boolean
}

interface MessageConfig extends BaseConfig {
  messages: Message[]
  pinTops?: boolean | number[]
  random?: boolean
  extraSpaces?: boolean
}

export class MessageManager {
  private currentMessageIndex = -1
  private config: MessageConfig
  private readonly scheduler: TaskScheduler
  private controller: LiveController
  private logger: ReturnType<typeof createLogger>
  private abortController = new AbortController()

  constructor(
    private readonly page: Page,
    private account: Account,
    userConfig: MessageConfig,
  ) {
    this.logger = createLogger(`${TASK_NAME} @${account.name}`)
    this.validateConfig(userConfig)
    this.config = userConfig
    this.scheduler = this.createTaskScheduler()
    this.controller = new LiveController(
      page,
      this.logger,
      this.abortController.signal,
    )
  }

  private createTaskScheduler() {
    return new TaskScheduler(
      TASK_NAME,
      (...args) => this.execute(...args),
      merge({}, this.config.scheduler, {
        onStart: () => this.logger.info('任务开始执行'),
        onStop: () => {
          this.logger.info('任务停止执行')
          this.abortController.abort()
          windowManager.send(
            IPC_CHANNELS.tasks.autoMessage.stoppedEvent,
            this.account.id,
          )
        },
      }),
      this.logger,
    )
  }

  private getNextMessage(): Message {
    const messages = this.config.messages

    if (this.config.random) {
      if (messages.length <= 1) {
        this.currentMessageIndex = 0
      } else if (this.currentMessageIndex < 0) {
        this.currentMessageIndex = randomInt(0, messages.length - 1)
      } else {
        // 不和上一条消息重复
        const nextIndex = randomInt(0, messages.length - 2)
        if (nextIndex < this.currentMessageIndex) {
          this.currentMessageIndex = nextIndex
        } else {
          this.currentMessageIndex = nextIndex + 1
        }
      }
    } else {
      this.currentMessageIndex =
        (this.currentMessageIndex + 1) % messages.length
    }
    return messages[this.currentMessageIndex]
  }

  private async execute(screenshot = false) {
    try {
      const message = this.getNextMessage()
      // 添加随机空格
      if (this.config.extraSpaces) {
        message.content = insertRandomSpaces(message.content)
      }
      const isPinTop = message.pinTop
      await this.controller.sendMessage(message.content, isPinTop)
    } catch (error) {
      // this.logger.error(
      //   `执行失败: ${error instanceof Error ? error.message : String(error)}`,
      // )
      if (screenshot) {
        await takeScreenshot(this.page, TASK_NAME, this.account.name).catch(e =>
          this.logger.debug(`截图失败：${e}`),
        )
      }
      throw error
    }
  }

  private validateConfig(userConfig: MessageConfig) {
    if (userConfig.messages.length === 0) {
      throw new Error('消息配置验证失败: 必须提供至少一条消息')
    }

    const badIndex = userConfig.messages.findIndex(
      msg => msg.content.length > 50,
    )
    if (badIndex >= 0) {
      throw new Error(
        `消息配置验证失败: 第 ${badIndex + 1} 条消息字数超出 50 字`,
      )
    }

    if (userConfig.scheduler.interval[0] > userConfig.scheduler.interval[1]) {
      throw new Error('配置验证失败：计时器区间设置错误')
    }

    this.logger.info(
      `消息配置验证通过，共加载 ${userConfig.messages.length} 条消息`,
    )
  }

  public start() {
    this.scheduler.start()
  }

  public stop() {
    this.scheduler.stop()
  }

  public updateConfig(newConfig: Partial<MessageConfig>) {
    const config = merge({}, this.config, newConfig)
    this.validateConfig(config)
    if (config.scheduler) {
      this.scheduler.updateConfig({ scheduler: config.scheduler })
    }
    this.config = config
  }

  public get currentMessage() {
    if (this.config.messages.length === 0) {
      return ''
    }
    return this.config.messages[Math.max(0, this.currentMessageIndex)]
  }

  public get isRunning() {
    return this.scheduler.isRunning
  }

  public static async sendBatchMessages(
    page: Page,
    messages: string[],
    count: number,
  ) {
    try {
      const controller = new LiveController(page)
      for (let i = 0; i < count; i++) {
        const messageIndex = randomInt(0, messages.length - 1)
        const message = insertRandomSpaces(messages[messageIndex])
        await controller.sendMessage(message)
        // 以防万一，加一个 1s 的小停顿
        await sleep(1000)
      }
      return true
    } catch {
      return false
    }
  }
}
