import type { Page, Response } from 'playwright'
import type { WebSocketService } from '#/services/WebSocketService'
import { BaseMessageListener } from '../BaseMessageListener'

interface MessageResponse {
  data: {
    messages: {
      // 评论
      comment: CommentMessage[] | null
      // 进入直播间
      room_enter?: RoomEnterMessage[]
      // 点赞
      room_like?: RoomLikeMessage[]
      // 加入品牌会员
      subscribe_merchant_brand_vip?: SubscribeMerchantBrandVipMessage[]
      // 关注
      room_follow?: RoomFollowMessage[]
      // 加入粉丝团
      ecom_fansclub_participate?: EcomFansclubParticipateMessage[]
    }
  }
}

interface LiveOrderResponse {
  data: {
    item_num: number
    nick_name: string
    order_id: string
    order_status: number // 已知： 3 -> 已支付          0 -> 已下单
    order_ts: number
    product_id: string
    product_title: string
  }[]
  msg: string
}

export class CompassAdapter extends BaseMessageListener {
  private compassPage: Page | undefined
  constructor(
    private page: Page,
    account: Account,
    wsService?: WebSocketService,
  ) {
    super(account, '电商罗盘监听', wsService)
  }

  private async init() {
    try {
      const liveRoomId = await this.getLiveRoomId()
      await this.gotoScreen(liveRoomId)
      this.listenResponse()
    } catch (error) {
      this.logger.error(error)
    }
  }

  public async getLiveRoomId() {
    return new Promise<string>((resolve, reject) => {
      const page = this.page
      const handleResponse = async (response: Response) => {
        const url = response.url()
        if (url.includes('promotions_v2?')) {
          const resData = await response.json()
          const roomId = resData?.data?.room_id
          if (roomId) {
            page.off('response', handleResponse)
            this.logger.debug(`获取直播间 ID成功: ${roomId}`)
            resolve(roomId)
          }
        }
      }
      page.on('response', handleResponse)
      setTimeout(() => {
        page.off('response', handleResponse)
        reject(new Error('找不到直播间 ID，可能直播间已关闭'))
      }, 10000)
    })
  }

  private async gotoScreen(liveRoomId: string) {
    const browserContext = this.page.context()
    this.compassPage = await browserContext.newPage()
    // 先进入罗盘，保存一下登录状态（直接访问大屏的话会让你去登录）
    // 百应的罗盘是 talent，抖店的罗盘是 shop
    const pageUrl = this.page.url()
    let subPath: string
    if (/buyin\.jinritemai/.test(pageUrl)) {
      subPath = 'talent'
    } else if (/fxg\.jinritemai/.test(pageUrl)) {
      subPath = 'shop'
    } else {
      throw new Error('不是百应|抖音平台')
    }
    await this.compassPage.goto(`https://compass.jinritemai.com/${subPath}`)
    this.logger.debug('正在尝试登录电商罗盘')
    // 等待罗盘自动登录
    await this.compassPage.waitForSelector('div[class^="userName"]')
    this.logger.debug('登录成功，正在进入大屏')
    // 再进入大屏
    await this.compassPage.goto(
      `https://compass.jinritemai.com/screen/anchor/${subPath}?live_room_id=${liveRoomId}`,
    )
    // 删除中间的直播画面，减少不必要的资源占用
    this.compassPage.locator('video').evaluate(el => {
      const video = el as HTMLVideoElement
      // 删太快也不行，找不到更好的方法之前只能死等一会了
      setTimeout(() => {
        video.pause()
        video.removeAttribute('src')
        video.load()
        video.remove()
      }, 3000)
    })
    this.logger.debug('大屏进入成功')
  }

  private listenResponse() {
    this.logger.debug('开始监听评论')

    const handleResponse = async (response: Response) => {
      const url = response.url()
      if (url.includes('message?')) {
        const data: MessageResponse = await response.json()
        this.handleMessageResponse(data)
      } else if (url.includes('live_order_stream?')) {
        const data: LiveOrderResponse = await response.json()
        this.handleLiveOrderResponse(data)
      }
    }

    this.compassPage?.on('response', handleResponse)
  }

  private handleMessageResponse(data: MessageResponse) {
    for (const messages of Object.values(data.data.messages)) {
      if (!messages) continue
      for (const message of messages) {
        const comment = { ...message, time: new Date().toLocaleTimeString() }
        this.broadcastMessage(comment)
      }
    }
  }

  private handleLiveOrderResponse(data: LiveOrderResponse) {
    const messages: LiveOrderMessage[] = data.data.map(item => {
      let order_status: LiveOrderMessage['order_status'] = '未知状态'
      // TODO: 不确定已下单对应的是多少！
      if (item.order_status <= 1) {
        order_status = '已下单'
      } else if (item.order_status === 3) {
        order_status = '已付款'
      }
      return {
        msg_type: 'live_order',
        msg_id: `${item.order_id}#${item.order_status}`,
        nick_name: item.nick_name,
        order_status,
        order_ts: item.order_ts,
        product_id: item.product_id,
        product_title: item.product_title,
      }
    })
    for (const message of messages) {
      const comment = {
        ...message,
        time: new Date().toLocaleTimeString(),
      }
      this.broadcastMessage(comment)
    }
  }

  async start() {
    await this.init()
  }

  stop() {
    this.compassPage?.removeAllListeners('response')
    this.compassPage?.close()
  }
}
