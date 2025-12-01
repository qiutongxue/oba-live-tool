import type { Page, Response } from 'playwright'
import type { ICommentListener } from '../IPlatform'
import { URLS } from './constant'

interface MsgResponse {
  errCode: number
  errMsg: string
  data: {
    msgList: Array<{
      nickname: string
      headUrl: string
      content: string
      type: number
      username: string
      seq: string
      clientMsgId: string

      finderLiveContact: {
        contact: {
          username: string
          nickname: string
          headUrl: string
          signature: string
          extInfo: {
            country: string
            province: string
            city: string
            sex: number
          }
        }
        liveIdentity: number
        enableComment: number
        badgeInfos: Array<{
          badgeType: number
          badgeLevel: number
        }>
      }

      // 状态字段
      isFloatmsg: number
      floatType: number
      isStickMsg: boolean
    }>
  }
}

export class WeChatChannelCommentListener implements ICommentListener {
  private handleComment: (comment: WechatChannelLiveMessage) => void = () => {}
  constructor(private page: Page) {
    this.handleResponse = this.handleResponse.bind(this)
  }
  readonly _isCommentListener = true

  getCommentListenerPage(): Page {
    return this.page
  }

  private async handleResponse(resp: Response) {
    const url = resp.url()
    if (!url.includes(URLS.MSG_API_PREFIX)) return
    const body = (await resp.json()) as MsgResponse
    if (body.errCode !== 0) return
    body.data.msgList.forEach(msg => {
      if (msg.type !== 1) return
      const message: WechatChannelLiveMessage = {
        msg_type: 'wechat_channel_live_msg',
        msg_id: msg.clientMsgId,
        nick_name: msg.nickname,
        user_id: msg.username,
        content: msg.content,
        time: new Date().toLocaleString(),
      }
      console.log(message)
      this.handleComment(message)
    })
  }

  public startCommentListener(onComment: (comment: WechatChannelLiveMessage) => void) {
    this.handleComment = onComment
    // 开始监听评论
    this.page.on('response', this.handleResponse)
  }

  public stopCommentListener() {
    this.page.off('response', this.handleResponse)
  }
}
