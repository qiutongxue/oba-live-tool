import type { CDPSession, Page, Response } from 'playwright'

interface WebSocketFrameReceivedEvent {
  requestId: string
  timestamp: number
  response: {
    opcode: number
    mask: boolean
    payloadData: string // 就你要的
  }
}

interface XiaohongshuWebSocketMessage {
  /** 1 */
  v: number
  /** 4 是需要的; 0 没有任何东西 */
  t: number
  /** 0ac开头，不知道是什么玩意 */
  m: string
  b: {
    d: {
      /** 0 */
      a: 0
      b: Array<{
        /** 这就是需要的信息，base64 编码 */
        d: string
        // biome-ignore lint/complexity/noBannedTypes: 暂时不知道 e 里有什么，就是个 {}
        e: {}
        /** 一串数字开头不知道是什么，是递增的 */
        m: string
      }>
      /** 值都是 room */
      biz: 'room'
      /** 时间戳 */
      t: number
    }
  }
}

interface ParsedWebsocketMessage {
  /** 1 是有用的，3 不管他 */
  command: number
  /** JSON 字符串，能转成 XiaohongshuMessage */
  customData: string
  msgId: string
  /** 3 */
  priority: number
  roomId: string
  /** LIVE */
  roomType: string
  /** 时间戳 */
  ts: number
  uuid: string
}

interface XiaohongshuMessage {
  /** text | refresh | letter_refresh | goods_rank_entrance_im 等等，评论就是 text */
  type: string
  /** 时间戳 */
  current_time: number
  source: string
  translated: boolean
  at_users: []
  /** 'zh-cn' | 'num_sp_ch'（数字字符） */
  origin_language: string
  commentId: string
  profile: {
    /** url */
    avatar: string
    nickname: string
    /** 可能主播是 1 */
    role: number
    user_id: string
    follow_status: number
  }
  /** 评论内容 */
  desc: string
  /** 0 */
  comment_type: number
  aggregate: boolean
  /** 1 */
  ack_code: number
}

interface XiaohongshuSendCommentResponse {
  data: {
    comment: string
    common_response: {
      common_result: number
      toast: string
    }
    profile: {
      user_id: string
    }
  }
  code: number
  success: boolean
}

export class XiaohongshuCommentListener {
  private client: CDPSession | null = null
  private accountName = ''
  private handleComment: (comment: LiveMessage) => void = () => {}

  constructor(private page: Page) {
    this.handleWebSocketResponse = this.handleWebSocketResponse.bind(this)
    this.handleResponse = this.handleResponse.bind(this)
  }

  private async getCDPSession() {
    const context = this.page.context()
    return await context.newCDPSession(this.page)
  }

  async startCommentListener(onComment: (comment: LiveMessage) => void): Promise<void> {
    if (!this.client) {
      this.client = await this.getCDPSession()
    }
    this.handleComment = onComment
    this.client.send('Network.enable')
    this.client.on('Network.webSocketFrameReceived', this.handleWebSocketResponse)
    // 还有主动发送的消息，不会通过 WebSocket
    this.page.on('response', this.handleResponse)
  }

  private async handleResponse(response: Response) {
    const url = response.url()
    if (!url.includes('send_comment')) return
    const respJson = (await response.json()) as XiaohongshuSendCommentResponse
    if (respJson.success) {
      const data = respJson.data
      const liveMessage: LiveMessage = {
        msg_type: 'xiaohongshu_comment',
        msg_id: crypto.randomUUID(), // 主动发送的没有 commentId
        nick_name: this.accountName ?? '',
        user_id: data.profile.user_id,
        content: data.comment,
        time: new Date().toLocaleTimeString(),
      }
      this.handleComment(liveMessage)
    }
  }

  private async handleWebSocketResponse({ response }: WebSocketFrameReceivedEvent) {
    const payload = response.payloadData
    const wsMessage: XiaohongshuWebSocketMessage = JSON.parse(payload)
    if (wsMessage.t !== 4) return
    const contentArray = wsMessage.b.d.b
    contentArray.forEach(content => {
      const commentMessage = this.parseWsContent(content)
      if (!commentMessage) return
      const liveMessage: LiveMessage = {
        msg_type: 'xiaohongshu_comment',
        msg_id: commentMessage.commentId,
        nick_name: commentMessage.profile.nickname,
        user_id: commentMessage.profile.user_id,
        content: commentMessage.desc,
        time: new Date(commentMessage.current_time).toLocaleTimeString(),
      }
      this.handleComment(liveMessage)
    })
  }

  private parseWsContent(content: XiaohongshuWebSocketMessage['b']['d']['b'][number]) {
    const newData = JSON.parse(
      Buffer.from(content.d, 'base64').toString('utf-8'),
    ) as ParsedWebsocketMessage
    if (newData.command !== 1) return null
    const message = JSON.parse(newData.customData) as XiaohongshuMessage
    if (message.type !== 'text') return null
    return message
  }

  public setAccountName(accountName: string) {
    this.accountName = accountName
  }

  stopCommentListener(): void {
    this.client?.off('Network.webSocketFrameReceived', this.handleWebSocketResponse)
    this.client?.send('Network.disable')
    this.page.off('response', this.handleResponse)
    this.client = null
  }
  getCommentListenerPage(): Page {
    return this.page
  }
}
