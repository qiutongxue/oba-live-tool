import type { WebSocketService } from '#/services/WebSocketService'
import { getRandomDouyinLiveMessage } from '#/utils'
import { BaseMessageListener } from '../BaseMessageListener'

export class LocalTestAdapter extends BaseMessageListener {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(account: Account, wsService?: WebSocketService) {
    super(account, '测试用', wsService)
  }

  async start() {
    this.timer = setInterval(() => {
      const message = getRandomDouyinLiveMessage()
      this.broadcastMessage(message)
    }, 1000)
  }

  stop(): void {
    this.timer && clearInterval(this.timer)
    this.timer = null
  }
}
