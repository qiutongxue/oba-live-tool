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
      /**
       * 1：普通消息，
       * 10017：上墙消息
       *  */
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
    appMsgList: Array<{
      /** 已知有：20002 */
      msgType: number
      /** 回复的内容，base64编码 */
      payload: string
      clientMsgId: string
      toUserContact: {
        contact: {
          usename: string
          nickname: string
        }
        displayNickname: string
      }
      fromUserContact: {
        contact: {
          usename: string
          nickname: string
        }
        displayNickname: string
      }
    }>
  }
}

interface AppMsgPayload {
  content: string
  refer_product_question_card_id: string
  reply_original_msg_type: number
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
      this.handleComment(message)
    })
    // 处理回复消息，这里的回复是通过点击评论的回复按钮触发的
    body.data.appMsgList.forEach(msg => {
      if (msg.msgType !== 20002) return
      const payload = JSON.parse(
        Buffer.from(msg.payload, 'base64').toString('utf-8'),
      ) as AppMsgPayload
      const content = payload.content
      const message: WechatChannelLiveMessage = {
        msg_type: 'wechat_channel_live_msg',
        msg_id: msg.clientMsgId,
        nick_name: msg.fromUserContact.contact.nickname,
        user_id: msg.fromUserContact.contact.usename,
        content,
        time: new Date().toLocaleString(),
      }
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
