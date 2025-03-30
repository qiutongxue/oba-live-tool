import { ipcMain } from 'electron'
import type { Page, Request, Response } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { type Account, pageManager } from '#/taskManager'
import windowManager from '#/windowManager'

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

class AutoReplyPlus {
  private page: Page | null = null
  constructor(private account: Account) {
    this.init()
  }

  private async init() {
    const context = pageManager.getContext()
    if (!context) {
      throw new Error('context is not found')
    }
    const liveRoomId = await this.getLiveRoomId(context)
    await this.gotoScreen(liveRoomId, context)
    this.listen()
  }

  public async getLiveRoomId(context: Context) {
    return new Promise<string>((resolve, reject) => {
      const page = context.page
      const handleRequest = (request: Request) => {
        const url = request.url()
        if (request.url().includes('info?comment_query')) {
          const wssPushRoomId = getWssPushRoomId(url)
          if (wssPushRoomId) {
            page.off('request', handleRequest)
            resolve(wssPushRoomId)
          }
        }
      }
      page.on('request', handleRequest)
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
    // 等待罗盘自动登录
    await this.page.waitForSelector('div[class^="userName"]')
    // 再进入大屏
    await this.page.goto(
      `https://compass.jinritemai.com/screen/anchor/shop?live_room_id=${liveRoomId}`,
    )
  }

  private listen() {
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
          IPC_CHANNELS.tasks.autoReplyPlus.message,
          {
            accountId: this.account.id,
            message,
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
        IPC_CHANNELS.tasks.autoReplyPlus.message,
        {
          accountId: this.account.id,
          message,
        },
      )
    }
  }

  public start() {}

  public stop() {}
}

function getWssPushRoomId(urlString: string): string | null {
  try {
    // 1. 使用 URL 对象解析 URL
    // 这比手动字符串查找更健壮，并且通常经过优化
    const url = new URL(urlString)

    // 2. 获取 'internal_ext' 查询参数的值
    // URLSearchParams 会自动处理 URL 解码
    const internalExtValue = url.searchParams.get('internal_ext')

    // 3. 检查参数是否存在
    if (!internalExtValue) {
      // console.warn("URL 中未找到 'internal_ext' 参数。");
      return null
    }

    // 4. 使用正则表达式从 internalExtValue 中提取 wss_push_room_id
    // 正则表达式通常比多次 split/indexOf 更快
    // 模式解释：
    // - (?:^|\|)  : 匹配字符串开头或管道符 '|' (非捕获组)
    // - wss_push_room_id: : 匹配字面量 "wss_push_room_id:"
    // - ([^|]+)  : 捕获组 1，匹配一个或多个非管道符 '|' 的字符 (这就是我们要的值)
    // - (?:\||$)  : 匹配管道符 '|' 或字符串结尾 (非捕获组)
    // 使用更简单的正则，因为我们知道 key 后面是 : 值后面是 | 或结尾
    const match = internalExtValue.match(/wss_push_room_id:([^|]+)/)

    // 5. 返回匹配结果
    // 如果匹配成功，match 是一个数组，第一个元素是整个匹配的字符串，
    // 第二个元素 (match[1]) 是第一个捕获组的内容，即我们需要的值。
    if (match?.[1]) {
      return match[1]
    }
    return null
  } catch (error) {
    // 处理无效的 URL 字符串
    if (error instanceof TypeError) {
      console.error('提供的字符串不是有效的 URL:', error.message)
    } else {
      console.error('解析 URL 时发生未知错误:', error)
    }
    return null
  }
}

function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.tasks.autoReplyPlus.getLiveRoomId, async () => {
    const account = pageManager.getActiveAccount()
    if (!account) {
      throw new Error('account is not found')
    }
    const autoReplyPlus = new AutoReplyPlus(account)
  })
}

setupIpcHandlers()
