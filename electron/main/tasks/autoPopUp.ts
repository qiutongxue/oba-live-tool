import type { RequiredWith } from '#/utils'
import type { ElementHandle, Page } from 'playwright'
import type { BaseConfig } from './scheduler'
import { GOODS_ACTION_SELECTOR, GOODS_ITEM_SELECTOR } from '#/constants'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import { randomInt } from '#/utils'
import windowManager from '#/windowManager'
import { ipcMain } from 'electron'
import { merge } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createScheduler } from './scheduler'

const TASK_NAME = '自动弹窗'
const logger = createLogger(TASK_NAME)

interface PopUpConfig extends BaseConfig {
  goodsIds: number[]
  random?: boolean
}

const DEFAULT_CONFIG: RequiredWith<PopUpConfig, 'scheduler'> = {
  scheduler: {
    name: TASK_NAME,
    interval: [30000, 45000],
  },
  goodsIds: [],
  random: false,
}

class PopUpManager {
  private currentGoodIndex = 0
  private config: RequiredWith<PopUpConfig, 'scheduler'>
  private readonly page: Page
  private readonly scheduler: ReturnType<typeof createScheduler>

  constructor(page: Page, userConfig: Partial<PopUpConfig> = {}) {
    this.page = page
    this.config = merge({}, DEFAULT_CONFIG, userConfig)
    this.scheduler = this.createTaskScheduler()
    this.validateConfig()
  }

  private createTaskScheduler() {
    return createScheduler(
      () => this.execute(),
      merge(this.config.scheduler, {
        onStart: () => logger.info(`「${TASK_NAME}」开始执行`),
        onStop: () => {
          logger.info(`「${TASK_NAME}」停止执行`)
          windowManager.sendToWindow('main', IPC_CHANNELS.tasks.autoPopUp.stop)
        },
      }),
    )
  }

  private async execute() {
    try {
      const goodsId = this.getNextGoodsId()
      logger.debug(`准备讲解商品 ID: ${goodsId}`)

      const goodsItem = await this.getGoodsItem(goodsId)
      await this.togglePresentation(goodsItem)
    }
    catch (error) {
      logger.error(`「${TASK_NAME}」执行失败: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  private getNextGoodsId(): number {
    if (this.config.random) {
      this.currentGoodIndex = randomInt(0, this.config.goodsIds.length - 1)
    }
    else {
      this.currentGoodIndex = (this.currentGoodIndex + 1) % this.config.goodsIds.length
    }
    return this.config.goodsIds[this.currentGoodIndex]
  }

  private async getGoodsItem(id: number) {
    const items = await this.page.$$(GOODS_ITEM_SELECTOR)
    if (id <= 0 || id > items.length)
      throw new Error(`商品 ${id} 不存在`)

    return items[id - 1]
  }

  private async togglePresentation(item: ElementHandle) {
    const actionPanel = await item.$(GOODS_ACTION_SELECTOR)
    const presBtnWrap = actionPanel && await actionPanel.$(`div[class*="wrapper"]:has(button)`)

    if (await this.isPresenting(presBtnWrap)) {
      await this.clickActionButton(presBtnWrap!, '取消讲解')
      await this.waitForStateChange(presBtnWrap!)
    }

    await this.clickActionButton(presBtnWrap!, '讲解')
  }

  private async isPresenting(element: ElementHandle | null) {
    if (!element)
      return false
    const activeBtn = await element.$('button[class*="active"]')
    return !!activeBtn && (await activeBtn.textContent()) === '取消讲解'
  }

  private async clickActionButton(element: ElementHandle, expectedText: string) {
    const button = await element.$('button')
    if (!button) {
      logger.error('操作按钮查找失败: 找不到操作按钮')
      throw new Error('找不到操作按钮')
    }

    const actualText = await button.textContent()
    if (actualText !== expectedText)
      throw new Error(`按钮状态不一致，期望: ${expectedText}，实际: ${actualText}`)

    await button.click()
    logger.success(`${expectedText} 商品 | ID: ${this.config.goodsIds[this.currentGoodIndex]} | 总商品数: ${this.config.goodsIds.length}`)
  }

  private async waitForStateChange(element: ElementHandle) {
    await element.waitForSelector(
      'button:not([class*="active"])',
      { timeout: 10000 },
    )
  }

  private validateConfig() {
    if (this.config.goodsIds.length === 0)
      throw new Error('商品配置验证失败: 必须提供至少一个商品ID')

    if (this.config.scheduler.interval[0] > this.config.scheduler.interval[1])
      throw new Error('配置验证失败：计时器区间设置错误')

    logger.info(`商品配置验证通过，共加载 ${this.config.goodsIds.length} 个商品`)
  }

  public start() {
    this.scheduler.start()
  }

  public stop() {
    this.scheduler.stop()
  }

  public updateConfig(newConfig: Partial<PopUpConfig>) {
    if (newConfig.scheduler)
      this.scheduler.updateConfig(newConfig)
    this.config = merge({}, this.config, newConfig)
  }

  public get isRunning() {
    return this.scheduler.isRunning
  }
}

// IPC 处理程序
function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.tasks.autoPopUp.start, async (_, config: Partial<PopUpConfig>) => {
    try {
      pageManager.register('autoPopUp', page => new PopUpManager(page, config))
      pageManager.startTask('autoPopUp')
      return true
    }
    catch (error) {
      logger.error('启动自动弹窗失败:', error instanceof Error ? error.message : error)
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoPopUp.stop, async () => {
    pageManager.stopTask('autoPopUp')
  })
}

setupIpcHandlers()

export function createAutoPopUp(page: Page, config: Partial<PopUpConfig> = {}) {
  return new PopUpManager(page, config)
}
