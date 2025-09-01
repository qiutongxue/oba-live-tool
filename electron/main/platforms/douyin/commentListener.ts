import type { Page, Response } from 'playwright'
import { sleep } from '#/utils'
import type { ICommentListener } from '../IPlatform'
import { SELECTORS, URLS } from './constant'

export class ControlListener implements ICommentListener {
  readonly _isCommentListener = true

  private isRunning = false
  private handleComment: (comment: DouyinLiveMessage) => void = () => {}
  constructor(private page: Page) {
    this.handleResponse = this.handleResponse.bind(this)
  }

  startCommentListener(onComment: (comment: DouyinLiveMessage) => void) {
    this.handleComment = onComment
    this.page.on('response', this.handleResponse)
    this.keepPageRunning()
  }

  stopCommentListener() {
    this.page.off('response', this.handleResponse)
  }

  private async handleResponse(response: Response) {
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
        this.handleComment(commentData)
      }
    }
  }

  private async keepPageRunning() {
    if (!this.isRunning) return
    // 检查是否弹出了保护窗口
    for (const selector of Object.values(SELECTORS.overlays)) {
      const element = await this.page.$(selector)
      if (element) {
        await element.dispatchEvent('click')
      }
    }
    // 有新评论的话点击评论按钮
    const newCommentButton = await this.page.$(SELECTORS.NEW_COMMENT_LABEL)
    if (newCommentButton) {
      await newCommentButton.dispatchEvent('click')
    }

    await sleep(3000)
    this.keepPageRunning()
  }

  getCommentListenerPage(): Page {
    return this.page
  }
}

interface CompassMessageResponse {
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

export class CompassListener implements ICommentListener {
  readonly _isCommentListener = true

  protected compassPage: Page | undefined
  private handleComment: (comment: DouyinLiveMessage) => void = () => {}
  constructor(
    private platform: 'buyin' | 'douyin',
    protected page: Page,
  ) {}

  protected async connectCompass() {
    const getLiveRoomId = () => {
      return new Promise<string>((resolve, reject) => {
        const page = this.page
        const handleResponse = async (response: Response) => {
          const url = response.url()
          if (url.includes('promotions_v2?')) {
            const resData = await response.json()
            const roomId = resData?.data?.room_id
            if (roomId) {
              page.off('response', handleResponse)
              // this.logger.debug(`获取直播间 ID成功: ${roomId}`)
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

    const liveRoomId = await getLiveRoomId()

    const browserContext = this.page.context()
    this.compassPage = await browserContext.newPage()

    await this.compassPage.goto(
      this.platform === 'douyin'
        ? URLS.DOUYIN_COMPASS_INDEX_PREFIX
        : URLS.BUYIN_COMPASS_INDEX_PREFIX,
    )
    // this.logger.debug('正在尝试登录电商罗盘')
    // 等待罗盘自动登录
    await this.compassPage.waitForSelector(SELECTORS.COMPASS_LOGGED_IN)
    // this.logger.debug('登录成功，正在进入大屏')
    // 再进入大屏
    await this.compassPage.goto(
      `${
        this.platform === 'douyin'
          ? URLS.DOUYIN_COMPASS_SCREEN_WITH_LIVE_ROOM_ID
          : URLS.BUYIN_COMPASS_SCREEN_WITH_LIVE_ROOM_ID
      }${liveRoomId}`,
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
    // this.logger.debug('大屏进入成功')
  }

  private listenResponse() {
    const handleResponse = async (response: Response) => {
      const url = response.url()
      if (url.includes('message?')) {
        const data: CompassMessageResponse = await response.json()
        this.handleMessageResponse(data)
      } else if (url.includes('live_order_stream?')) {
        const data: LiveOrderResponse = await response.json()
        this.handleLiveOrderResponse(data)
      }
    }

    this.compassPage?.on('response', handleResponse)
  }

  private handleMessageResponse(data: CompassMessageResponse) {
    for (const messages of Object.values(data.data.messages)) {
      if (!messages) continue
      for (const message of messages) {
        const comment = { ...message, time: new Date().toLocaleTimeString() }
        this.handleComment(comment)
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
      this.handleComment(comment)
    }
  }

  async startCommentListener(onComment: (comment: DouyinLiveMessage) => void) {
    this.handleComment = onComment
    await this.connectCompass()
    this.listenResponse()
  }

  stopCommentListener() {
    this.compassPage?.removeAllListeners('response')
    this.compassPage?.close()
  }

  getCommentListenerPage(): Page {
    return this.compassPage ?? this.page
  }
}
