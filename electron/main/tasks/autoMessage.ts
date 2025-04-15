import { ipcMain } from 'electron'
import { merge } from 'lodash-es'
import type { Page } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import type { Account } from '#/taskManager'
import { pageManager } from '#/taskManager'
import { randomInt, takeScreenshot } from '#/utils'
import windowManager from '#/windowManager'
import { LiveController } from './Controller'
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

function insertRandomSpaces(text: string, insertionProbability = 0.3): string {
  // 不处理空字符串或概率为0的情况
  if (!text || insertionProbability <= 0) return text

  // 限制概率在合理范围内
  const probability = Math.min(Math.max(insertionProbability, 0), 1)

  const result: string[] = []
  let lastWasSpace = false // 避免连续多个空格

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    result.push(char)

    // 不在空格后立即再插入空格，避免过多空格影响阅读
    if (
      !lastWasSpace &&
      char !== ' ' &&
      i < text.length - 1 && // 不在末尾插入
      text[i + 1] !== ' ' && // 下一个字符不是空格
      Math.random() < probability
    ) {
      // 随机决定插入1个还是2个空格(小概率)
      const spacesToInsert = Math.random() < 0.9 ? 1 : 2
      result.push(' '.repeat(spacesToInsert))
      lastWasSpace = true
    } else {
      lastWasSpace = char === ' '
    }
  }

  return result.join('')
}
class MessageManager {
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
          windowManager.sendToWindow(
            'main',
            IPC_CHANNELS.tasks.autoMessage.stop,
            this.account.id,
          )
        },
      }),
      this.logger,
    )
  }

  private getNextMessage(): Message {
    if (this.config.random) {
      this.currentMessageIndex = randomInt(0, this.config.messages.length - 1)
    } else {
      this.currentMessageIndex =
        (this.currentMessageIndex + 1) % this.config.messages.length
    }
    return this.config.messages[this.currentMessageIndex]
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
        await takeScreenshot(this.page, TASK_NAME, this.account.name).catch()
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
}

// IPC 处理程序
function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.start, async (_, config) => {
    try {
      pageManager.register(
        TASK_NAME,
        (page, account) => new MessageManager(page, account, config),
      )
      pageManager.startTask(TASK_NAME)
      return true
    } catch (error) {
      const logger = createLogger(
        `${TASK_NAME} @${pageManager.currentAccountName}`,
      )
      logger.error(
        '启动自动发言失败:',
        error instanceof Error ? error.message : error,
      )
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.stop, async () => {
    pageManager.stopTask(TASK_NAME)
    return true
  })

  ipcMain.handle(
    IPC_CHANNELS.tasks.autoMessage.updateConfig,
    async (_, newConfig) => {
      pageManager.updateTaskConfig(TASK_NAME, newConfig)
    },
  )
}

setupIpcHandlers()
