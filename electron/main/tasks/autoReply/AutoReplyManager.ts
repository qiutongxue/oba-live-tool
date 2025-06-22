import type { Page } from 'playwright'
import { WebSocketService } from '#/services/WebSocketService'
import { isDev, isMockTest } from '#/utils'
import type { AutoReplyConfig } from '.'
import type { BaseMessageListener } from './BaseMessageListener'
import { CompassAdapter } from './adapters/DouyinCompassAdapter'
import { ControlPanelAdapter } from './adapters/DouyinControlPanelAdapter'
import { LocalTestAdapter } from './adapters/LocalTestAdapter'

export class AutoReplyManager {
  private listener: BaseMessageListener | null = null
  private wsService: WebSocketService | undefined
  public isRunning = false

  constructor(
    private page: Page,
    private account: Account,
    private config: AutoReplyConfig,
  ) {}

  async start() {
    if (this.config.ws) {
      this.wsService = new WebSocketService()
      // 启动 WebSocket 服务
      this.wsService.start(this.config.ws.port)
    }

    if (isDev() && isMockTest()) {
      this.listener = new LocalTestAdapter(this.account, this.wsService)
    } else if (this.config.source === 'control') {
      this.listener = new ControlPanelAdapter(
        this.page,
        this.account,
        this.wsService,
      )
    } else if (this.config.source === 'compass') {
      this.listener = new CompassAdapter(
        this.page,
        this.account,
        this.wsService,
      )
    }

    await this.listener?.start()

    this.isRunning = true
  }

  stop() {
    this.listener?.stop()
    this.wsService?.stop()
    this.isRunning = false
    this.listener = null
  }

  updateConfig() {
    // 保持接口兼容性
  }
}
