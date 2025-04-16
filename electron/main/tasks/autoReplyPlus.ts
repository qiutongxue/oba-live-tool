import { ipcMain } from 'electron'
import type { Page, Request, Response } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { type Account, pageManager } from '#/taskManager'
import { typedIpcMainHandle } from '#/utils'
import windowManager from '#/windowManager'

const TASK_NAME = '自动回复Plus'

type Context = NonNullable<ReturnType<typeof pageManager.getContext>>

export interface CommentMessage {
  msg_type: 'comment'
  msg_id: string
  nick_name: string
  conent: string
}

export interface RoomEnterMessage {
  msg_type: 'room_enter'
  msg_id: string
  nick_name: string
  user_id: string
}

export interface RoomLikeMessage {
  msg_type: 'room_like'
  msg_id: string
  nick_name: string
  user_id: string
}

export interface SubscribeMerchantBrandVipMessage {
  msg_type: 'subscribe_merchant_brand_vip'
  msg_id: string
  nick_name: string
  user_id: string
  content: string
}

export interface RoomFollowMessage {
  msg_type: 'room_follow'
  msg_id: string
  nick_name: string
  user_id: string
}

export interface EcomFansclubParticipateMessage {
  msg_type: 'ecom_fansclub_participate'
  msg_id: string
  nick_name: string
  user_id: string
  content: string
}

export interface LiveOrderMessage {
  msg_type: 'live_order'
  nick_name: string
  msg_id: string
  order_status: number
  order_ts: number
  product_id: string
  product_title: string
}

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
    order_status: number // 不清楚
    order_ts: number
    product_id: string
    product_title: string
  }[]
  msg: string
}

export class AutoReplyPlus {
  public isRunning = false
  private logger: ReturnType<typeof createLogger>
  private page: Page | null = null
  constructor(private account: Account) {
    this.logger = createLogger(`${TASK_NAME} @${this.account.name}`)
  }

  private async init() {
    try {
      const context = pageManager.getContext()
      if (!context) {
        throw new Error('context is not found')
      }
      const liveRoomId = await this.getLiveRoomId(context)
      await this.gotoScreen(liveRoomId, context)
      this.listenResponse()
    } catch (error) {
      this.logger.error(error)
    }
  }

  public async getLiveRoomId(context: Context) {
    return new Promise<string>((resolve, reject) => {
      const page = context.page
      const handleResponse = async (response: Response) => {
        const url = response.url()
        if (response.url().includes('promotions_v2?')) {
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

  private async gotoScreen(liveRoomId: string, context: Context) {
    const browserContext = context.browserContext
    if (!browserContext) {
      throw new Error('browserContext is not found')
    }
    this.page = await browserContext.newPage()
    // 先进入罗盘，保存一下登录状态（直接访问大屏的话会让你去登录）
    // 百应的罗盘是 talent，抖店的罗盘是 shop
    const subPath = context.platform === 'douyin' ? 'shop' : 'talent'
    await this.page.goto(`https://compass.jinritemai.com/${subPath}`)
    this.logger.debug('正在尝试登录电商罗盘')
    // 等待罗盘自动登录
    await this.page.waitForSelector('div[class^="userName"]')
    this.logger.debug('登录成功，正在进入大屏')
    // 再进入大屏
    await this.page.goto(
      `https://compass.jinritemai.com/screen/anchor/${subPath}?live_room_id=${liveRoomId}`,
    )
    // 删除中间的直播画面，减少不必要的资源占用
    this.page.locator('video').evaluate(el => {
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
    this.page?.on('response', handleResponse)
  }

  private handleMessageResponse(data: MessageResponse) {
    for (const messages of Object.values(data.data.messages)) {
      if (!messages) continue
      for (const message of messages) {
        windowManager.sendToWindow(
          'main',
          IPC_CHANNELS.tasks.autoReply.showComment,
          {
            accountId: this.account.id,
            comment: {
              ...message,
              time: new Date().toLocaleTimeString(),
            },
          },
        )
      }
    }
  }

  private handleLiveOrderResponse(data: LiveOrderResponse) {
    const messages: LiveOrderMessage[] = data.data.map(item => ({
      msg_type: 'live_order',
      msg_id: `${item.order_id}#${item.order_status}`,
      nick_name: item.nick_name,
      order_status: item.order_status,
      order_ts: item.order_ts,
      product_id: item.product_id,
      product_title: item.product_title,
    }))
    for (const message of messages) {
      windowManager.sendToWindow(
        'main',
        IPC_CHANNELS.tasks.autoReply.showComment,
        {
          accountId: this.account.id,
          comment: {
            ...message,
            time: new Date().toLocaleTimeString(),
          },
        },
      )
    }
  }

  public start() {
    this.isRunning = true
    this.init()
  }

  public stop() {
    this.isRunning = false
    this.page?.removeAllListeners('response')
    this.page?.close()
  }

  public updateConfig() {}
}

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReplyPlus.startCommentListener,
    async () => {
      pageManager.register(TASK_NAME, (_, account) => {
        return new AutoReplyPlus(account)
      })
      pageManager.startTask(TASK_NAME)
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoReplyPlus.stopCommentListener,
    async () => {
      pageManager.stopTask(TASK_NAME)
    },
  )
}

setupIpcHandlers()
