import type { Page, Response } from 'playwright'

const API_PREFIX = 'https://h5api.m.taobao.com/h5/mtop.taobao.iliad.comment.query.anchorlatest/3.0'

interface TaobaoV3Response {
  api: string
  data: {
    comments: TaobaoComment[]
    delay: string
    /** JSON 字符串 */
    paginationContext: string
  }
  /** ["SUCCESS::调用成功"] */
  ret: string[]
  traceId: string
  v: string
}

interface TaobaoComment {
  commentId: string
  /** 可能是商品信息，需要详细数据 */
  commodities: []
  content: string
  publisherId: string
  /** 显示在评论中的昵称（和淘宝昵称区分） */
  publisherNick: string

  renders: {
    render_anchor: 'true' | 'false'
    /** “已加购”标签 */
    isAddCart: '0' | '1'
    /** “已下单”标签 */
    isOrder: '0' | '1'

    liveId: string
    fanLevel: string

    tbUserIdEncode: string
    /** 可能可以区分普通评论和下单/加购的评论？ */
    showMod: 'COMMON' | string

    medalIcon: string
  }
  /** 涉及回复的评论ID（0表示未回复） */
  replyToCommentId: string
  /** 涉及回复的用户ID（0表示未回复） */
  replyToUserId: string
  // 这是淘宝昵称（也是获取的 AccountName）
  tbNick: string
  timestamp: string
}

export class TaobaoCommentListener {
  constructor(
    private page: Page,
    private handleComment: (comment: LiveMessage) => void,
  ) {
    this.handleResponse = this.handleResponse.bind(this)
  }

  async start() {
    this.page.on('response', this.handleResponse)
  }

  private async handleResponse(resp: Response) {
    if (resp.url().startsWith(API_PREFIX)) {
      const jsonpText = await resp.text()
      const match = jsonpText.match(/^[^(]+\((.*)\)$/s)
      if (match) {
        const json = JSON.parse(match[1]) as TaobaoV3Response
        if (!json?.data?.comments) {
          return
        }
        for (const comment of json.data.comments) {
          this.handleComment({
            msg_type: 'taobao_comment',
            msg_id: comment.commentId,
            // TODO: 这里用publisherNick还是tbNick？
            // tbNick 才能过滤主播评论吧？
            nick_name: comment.publisherNick,
            user_id: comment.publisherId,
            time: new Date(Number(comment.timestamp)).toLocaleTimeString(),
            content: comment.content,
          })
        }
      }
    }
  }

  stop() {
    this.page.off('response', this.handleResponse)
  }

  getPage() {
    return this.page
  }
}
