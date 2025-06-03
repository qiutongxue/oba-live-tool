import type { Page, Response } from 'playwright'
import type { WebSocketService } from '#/services/WebSocketService'
import type { Account } from '#/taskManager'
import { LiveController } from '#/tasks/controller/LiveController'
import { sleep } from '#/utils'
import { BaseMessageListener } from '../BaseMessageListener'

export class ControlPanelAdapter extends BaseMessageListener {
  private controller: LiveController
  private isRunning = false

  constructor(
    private page: Page,
    account: Account,
    wsService?: WebSocketService,
  ) {
    super(account, '中控台监听', wsService)
    this.controller = new LiveController(page)
  }

  async start() {
    this.isRunning = true
    this.page.on('response', this.handleResponse.bind(this))
    this.keepPageRunning()
  }

  private async handleResponse(response: Response) {
    try {
      const url = response.url()
      if (url.includes('comment/info?')) {
        const body = await response.json()
        for (const comment of body.data.comment_infos) {
          const commentData: DouyinLiveMessage = {
            msg_id: comment.comment_id,
            nick_name: comment.nick_name,
            content: comment.content,
            msg_type: 'comment',
            time: new Date().toLocaleTimeString(),
          }

          this.broadcastMessage(commentData)
        }
      }
    } catch (error) {
      this.logger.error(
        '监听评论失败:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  stop(): void {
    this.isRunning = false
    this.page.removeAllListeners('response')
    throw new Error('Method not implemented.')
  }

  private async keepPageRunning() {
    if (!this.isRunning) return
    // 检查是否弹出了保护窗口
    await this.controller.recoveryLive()
    // 有新评论的话点击评论按钮
    const newCommentButton = await this.page.$('[class^="newCommentLabel"]')
    if (newCommentButton) {
      await newCommentButton.dispatchEvent('click')
    }

    await sleep(3000)
    this.keepPageRunning()
  }
}
