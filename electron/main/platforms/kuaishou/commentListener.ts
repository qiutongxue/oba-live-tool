import type { Page } from 'playwright'

interface RecvData {
  commentList?: Comment[]
  replyRate?: {}
}

interface Comment {
  commentContent: string
  commentId: string
  fromUserId: string
  fromUserName: string
  commentTime: string // timestamp
  commentSource: number // 0: 主播
  commentSourceTips: string // '主播'
}

export class KuaishouCommentListener {
  private handleComment: (comment: LiveMessage) => void = () => {}
  private isListening = false
  private isFunctionInjected = false
  constructor(private page: Page) {}

  static async hook(page: Page) {
    await page.route('**/lib-es-link*.js', async route => {
      // 强行禁掉 JS 缓存，防止浏览器读取 304 缓存导致注入失败
      const response = await route.fetch({ headers: { 'Cache-Control': 'no-cache' } })
      let jsContent = await response.text()

      if (jsContent.includes('decodePayload')) {
        jsContent = jsContent.replace(
          /([a-zA-Z0-9_$]+)\s*=\s*this\.decodePayload\(([^)]*?["']receive["']\s*)\)/g,
          '$1 = (function(res) { try { window.__onLiveMessage && window.__onLiveMessage(res) } catch(e) {} return res; })(this.decodePayload($2))',
        )
      }
      await route.fulfill({ response, body: jsContent })
    })
  }

  handleMessage(data: RecvData) {
    if (data?.commentList) {
      for (const comment of data.commentList) {
        this.handleComment({
          content: comment.commentContent,
          msg_type: 'comment',
          msg_id: comment.commentId,
          nick_name: comment.fromUserName,
          time: new Date(Number(comment.commentTime)).toLocaleTimeString(),
        })
      }
    }
  }

  startCommentListener(onComment: (comment: LiveMessage) => void) {
    this.handleComment = onComment
    this.isListening = true
    if (!this.isFunctionInjected) {
      this.page.exposeFunction('__onLiveMessage', (data: RecvData) => {
        if (this.isListening) this.handleMessage(data)
      })
      this.isFunctionInjected = true
    }
  }

  stopCommentListener(): void {
    this.isListening = false
  }

  getPage() {
    return this.page
  }
}
