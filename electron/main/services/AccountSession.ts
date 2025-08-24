import { IPC_CHANNELS } from 'shared/ipcChannels'
import { emitter } from '#/event/eventBus'
import { createLogger } from '#/logger'
import { BuyinPlatform } from '#/platforms/buyin'
import { DevPlatform } from '#/platforms/dev'
import { DouyinPlatform } from '#/platforms/douyin'
import { DouyinEosPlatform } from '#/platforms/douyin-eos'
import {
  type IPlatform,
  isPerformComment,
  isPerformPopup,
} from '#/platforms/IPlatform'
import { KuaishouPlatform } from '#/platforms/kuaishou'
import { TaobaoPlatform } from '#/platforms/taobao'
import { WechatChannelPlatform } from '#/platforms/wechat-channels'
import { XiaohongshuPlatform } from '#/platforms/xiaohongshu'
import { AutoCommentTask } from '#/tasks/AutoCommentTask'
import { AutoPopupTask } from '#/tasks/AutoPopupTask'
import { BrowserSessionManager } from '#/tasks/connection/BrowserSessionManager'
import type { BrowserSession, StorageState } from '#/tasks/connection/types'
import type { ITask } from '#/tasks/ITask'
import { SendBatchMessageTask } from '#/tasks/SendBatchMessageTask'
import windowManager from '#/windowManager'

const browserFactory = BrowserSessionManager.getInstance()

export class AccountSession {
  private platform: IPlatform
  private browserSession: BrowserSession | null = null
  private activeTasks: Map<LiveControlTask['type'], ITask> = new Map()

  constructor(
    platformName: LiveControlPlatform,
    private account: Account,
    private logger = createLogger(`@${account.name}`),
  ) {
    this.platform = new platformFactory[platformName]()
  }

  async connect(config: { headless?: boolean; storageState?: string }) {
    let storageState: StorageState
    if (config.storageState) {
      //   this.logger.info('检测到已保存登录状态')
      storageState = JSON.parse(config.storageState)
    }

    this.browserSession = await browserFactory.createSession(
      config.headless,
      storageState,
    )

    await this.ensureAuthenticated(this.browserSession, config.headless)

    const state = JSON.stringify(
      await this.browserSession.context.storageState(),
    )

    // 登录成功之后马上先保存一次登录状态，确保后续发生意外后不用重新登录
    windowManager.send(IPC_CHANNELS.chrome.saveState, this.account.id, state)

    // 此时可以确保正在中控台页面，获取用户名
    const accountName = await this.platform.getAccountName(this.browserSession)

    // 浏览器被外部主动关闭时，程序自动断开所有操作
    this.browserSession.context.on('close', () => {
      // 通知 AccountManager 关闭该 session，同时会调用 disconnect()
      emitter.emit('page-closed', { accountId: this.account.id })
    })
    return {
      accountName,
      storageState: state,
    }
  }

  async disconnect() {
    this.logger.warn('与中控台断开连接')
    // 通过程序关闭浏览器（并非多余的操作，因为 MacOS 的 context 关闭时不会关闭浏览器进程）
    this.browserSession?.browser
      .close()
      .catch(e => this.logger.error(`无法关闭浏览器：${e}`))
    this.activeTasks.values().forEach(task => task.stop())
  }

  private async ensureAuthenticated(session: BrowserSession, headless = true) {
    this.browserSession = session
    const isConnected = await this.platform.connect(this.browserSession)
    // 未登录，需要等待登录
    if (!isConnected) {
      // 无头模式，需要先关闭原先的无头模式，启用有头模式给用户登录
      if (headless) {
        await this.browserSession.browser.close()
        this.browserSession = await browserFactory.createSession(false)
      }
      // 等待登录
      await this.platform.login(this.browserSession)
      // 保存登录状态
      const storageState = await this.browserSession.context.storageState()
      // 无头模式，需要先关闭当前的有头模式，重新打开无头模式
      if (headless) {
        await this.browserSession.browser.close()
        this.browserSession = await browserFactory.createSession(
          headless,
          storageState,
        )
      }
      await this.ensureAuthenticated(session, headless)
    }
  }

  public async startTask(task: LiveControlTask) {
    if (!this.browserSession) {
      throw new Error('未与中控台建立连接')
    }
    let newTask: ITask
    if (task.type === 'auto-popup') {
      if (!isPerformPopup(this.platform)) {
        throw new Error(`暂未为${this.platform.platformName}实现自动弹窗功能`)
      }
      newTask = new AutoPopupTask(
        this.platform.getPopupPage(),
        this.platform,
        task.config,
        this.account,
        this.logger,
      )
    } else if (task.type === 'auto-comment') {
      if (!isPerformComment(this.platform)) {
        throw new Error(`暂未为${this.platform.platformName}实现自动评论功能`)
      }
      newTask = new AutoCommentTask(
        this.platform.getCommentPage(),
        this.platform,
        task.config,
        this.account,
        this.logger,
      )
    } else if (task.type === 'send-batch-messages') {
      if (!isPerformComment(this.platform)) {
        throw new Error(`暂未为${this.platform.platformName}实现批量评论功能`)
      }
      newTask = new SendBatchMessageTask(this.platform, task.config)
    } else {
      throw new Error('还没实现')
    }

    // 任务停止时从任务列表中移除
    newTask.onStop(() => {
      this.activeTasks.delete(task.type)
    })
    this.activeTasks.set(task.type, newTask)
    newTask.start()
  }

  public stopTask(taskType: LiveControlTask['type']) {
    const task = this.activeTasks.get(taskType)
    if (task) {
      task.stop()
    } else {
      this.logger.warn('无法停止任务：未找到正在运行中的任务')
    }
  }

  public updateTaskConfig<T extends LiveControlTask>(
    type: T['type'],
    config: Partial<T['config']>,
  ) {
    const task = this.activeTasks.get(type)
    if (task?.updateConfig) {
      task.updateConfig(config)
    }
  }
}

const platformFactory: Record<
  LiveControlPlatform | 'dev',
  { new (): IPlatform }
> = {
  buyin: BuyinPlatform,
  douyin: DouyinPlatform,
  redbook: XiaohongshuPlatform,
  wxchannel: WechatChannelPlatform,
  taobao: TaobaoPlatform,
  kuaishou: KuaishouPlatform,
  eos: DouyinEosPlatform,
  dev: DevPlatform,
}
