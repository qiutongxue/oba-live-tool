import type { Page } from 'playwright'
import type { BaseConfig } from './scheduler'
import { COMMENT_TEXTAREA_SELECTOR, PIN_TOP_SELECTOR } from '#/constants'
import { createLogger } from '#/logger'
import { randomInt, type RequiredWith } from '#/utils'
import { merge } from 'lodash-es'
import { createScheduler } from './scheduler'

const TASK_NAME = '自动发言'

interface MessageConfig extends BaseConfig {
  messages: string[]
  pinTops?: boolean | number[]
  random?: boolean
}

const DEFAULT_CONFIG: RequiredWith<MessageConfig, 'scheduler'> = {
  scheduler: {
    name: TASK_NAME,
    interval: [30000, 60000],
  },
  messages: [],
  random: false,
}

export function createAutoMessage(page: Page, userConfig: Partial<MessageConfig> = {}) {
  let currentMessageIndex = 0
  const config = merge({}, DEFAULT_CONFIG, userConfig)
  const logger = createLogger(TASK_NAME)

  async function exectute() {
    try {
      const message = getNextMessage()
      await sendMessage(message)
    }
    catch (e) {
      if (e instanceof Error) {
        logger.error(`「${TASK_NAME}」执行失败: ${e.message}`)
      }
      throw e
    }
  }

  function getNextMessage() {
    if (config.random) {
      currentMessageIndex = randomInt(0, config.messages.length - 1)
    }
    else {
      currentMessageIndex = (currentMessageIndex + 1) % config.messages.length
    }
    return config.messages[currentMessageIndex]
  }

  async function sendMessage(message: string) {
    const textarea = await page.$(COMMENT_TEXTAREA_SELECTOR)
    if (!textarea) {
      throw new Error('找不到评论框，请检查是否开播 | 页面是否在直播中控台')
    }
    await textarea.fill(message)
    const isPinTop = await pinTop()
    await textarea.press('Enter')
    logger.success(`发送${isPinTop ? '「置顶」' : ''}消息: ${message}`)
  }

  async function pinTop() {
    const { pinTops } = config
    if (pinTops === true || (Array.isArray(pinTops) && pinTops.includes(currentMessageIndex))) {
      // 置顶
      const pinTopLabel = await page.$(PIN_TOP_SELECTOR)
      if (!pinTopLabel) {
        throw new Error('找不到置顶按钮，请检查是否开播 | 页面是否在直播中控台')
      }
      await pinTopLabel.click()
      return true
    }
    return false
  }

  const scheduler = createScheduler(
    exectute,
    merge(config.scheduler, {
      onStart: () => {
        logger.info(`「${TASK_NAME}」开始执行`)
      },
      onStop: () => {
        logger.info(`「${TASK_NAME}」停止执行`)
      },
    }),
  )

  return {
    start: () => scheduler.start(),
    stop: () => scheduler.stop(),
    updateConfig: (newConfig: Partial<MessageConfig>) => {
      if (newConfig.scheduler) {
        scheduler.updateConfig(newConfig)
      }
    },
    get currentMessage() {
      return config.messages[currentMessageIndex]
    },
    get isRunning() {
      return scheduler.isRunning
    },
  }
}
