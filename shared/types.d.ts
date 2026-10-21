declare type Account = {
  readonly id: string
  name: string
}

declare interface ProviderInfo {
  name: string
  baseURL: string
  apiUrl: string
  models: string[]
}

declare type LiveControlPlatform =
  | 'douyin'
  | 'buyin'
  | 'eos'
  | 'xiaohongshu'
  | 'pgy'
  | 'wxchannel'
  | 'kuaishou'
  | 'taobao'
  | 'dev'

declare type GoodsItem = {
  id: number
  /** 单品循环弹窗次数，默认 1 */
  repeatCount?: number
  /** 无限循环：该商品永远参与轮转，不受 repeatCount 的 10000 上限约束 */
  repeatInfinite?: boolean
  /** 单品弹窗间隔 [min, max] 毫秒，不设则用全局间隔 */
  itemInterval?: [number, number]
}

declare type AutoPopupConfig = {
  scheduler: {
    interval: [number, number]
  }
  goodsIds: number[]
  goodsItems?: GoodsItem[]
  random?: boolean
}

declare type AutoPopupTask = {
  type: 'auto-popup'
  config: AutoPopupConfig
}

declare type AutoCommentConfig = {
  scheduler: {
    interval: [number, number]
  }
  messages: {
    content: string
    pinTop: boolean
  }[]
  random?: boolean
  extraSpaces?: boolean
  unlimitedLength?: boolean
}

declare type AutoCommentTask = {
  type: 'auto-comment'
  config: AutoCommentConfig
}

declare type SendBatchMessagesConfig = {
  messages: string[]
  count: number
  noSpace?: boolean
}

declare type SendBatchMessagesTask = {
  type: 'send-batch-messages'
  config: SendBatchMessagesConfig
}

declare interface CommentListenerConfig {
  source: 'compass' | 'control' | 'wechat-channel' | 'xiaohongshu' | 'taobao' | 'kuaishou'
  ws?: {
    port: number
  }
}

declare type CommentListenerTask = {
  type: 'comment-listener'
  config: CommentListenerConfig
}

declare type PinCommentTask = {
  type: 'pin-comment'
  config: {
    comment: string
  }
}

/**
 * 评论区自动滚动：把中控台「评论管理」里的消息列表持续滚到底部。
 * eos 页面的评论列表偶尔会停止自动跟随，导致一直停留在旧消息上。
 */
declare type CommentScrollConfig = {
  /** 滚动间隔（毫秒区间），默认 [2500, 4000] */
  interval?: [number, number]
}

declare type CommentScrollTask = {
  type: 'comment-scroll'
  config: CommentScrollConfig
}

/** 一次滚动尝试的结果 */
declare type CommentScrollStatus = 'scrolled' | 'already-bottom' | 'no-title' | 'no-scrollable'

/** 一次滚动的诊断报告：失败时靠它定位到底卡在哪一步 */
declare type CommentScrollReport = {
  status: CommentScrollStatus
  /** 命中方式：text=按「评论管理」文本定位；class=按 comment 类名兜底；none=都没命中 */
  via: 'text' | 'class' | 'none'
  /** 找到的可滚动候选数量 */
  candidates: number
  /** 选中的容器摘要（类名片段 + 尺寸），没选中时为空串 */
  target: string
}

declare type LiveControlTask =
  | AutoPopupTask
  | AutoCommentTask
  | SendBatchMessagesTask
  | CommentListenerTask
  | PinCommentTask
  | CommentScrollTask
  | MarketingLoopTask

declare type DouyinLiveMessage = {
  time: number
} & (
  | CommentMessage
  | RoomEnterMessage
  | RoomLikeMessage
  | LiveOrderMessage
  | SubscribeMerchantBrandVipMessage
  | RoomFollowMessage
  | EcomFansclubParticipateMessage
)

interface CommentMessage {
  msg_type: 'comment'
  msg_id: string
  nick_name: string
  content: string
}

interface RoomEnterMessage {
  msg_type: 'room_enter'
  msg_id: string
  nick_name: string
  user_id: string
}

interface RoomLikeMessage {
  msg_type: 'room_like'
  msg_id: string
  nick_name: string
  user_id: string
}

interface SubscribeMerchantBrandVipMessage {
  msg_type: 'subscribe_merchant_brand_vip'
  msg_id: string
  nick_name: string
  user_id: string
  content: string
}

interface RoomFollowMessage {
  msg_type: 'room_follow'
  msg_id: string
  nick_name: string
  user_id: string
}

interface EcomFansclubParticipateMessage {
  msg_type: 'ecom_fansclub_participate'
  msg_id: string
  nick_name: string
  user_id: string
  content: string
}

interface LiveOrderMessage {
  msg_type: 'live_order'
  nick_name: string
  msg_id: string
  order_status: '已下单' | '已付款' | '未知状态'
  order_ts: number
  product_id: string
  product_title: string
}

declare type WechatChannelLiveMessage = {
  msg_type: 'wechat_channel_live_msg'
  msg_id: string
  nick_name: string
  user_id: string
  content: string
  time: number
}

declare type XiaohongshuCommentLiveMessage = {
  msg_type: 'xiaohongshu_comment'
  msg_id: string
  nick_name: string
  user_id: string
  content: string
  time: number
}

declare type TaobaoCommentLiveMessage = {
  msg_type: 'taobao_comment'
  msg_id: string
  nick_name: string
  user_id: string
  content: string
  time: number
}

declare type LiveMessage =
  | WechatChannelLiveMessage
  | DouyinLiveMessage
  | XiaohongshuCommentLiveMessage
  | TaobaoCommentLiveMessage

// ==================== 营销工具（抖音团购：福袋 / 优惠券） ====================

/** 本场直播福袋列表中的一条（用作可复制的模板） */
declare type GiftBagTemplate = {
  /** 在列表中的序号（1 起，按界面顺序） */
  index: number
  /** 福袋信息文本（奖品 / 券名等） */
  desc: string
  /** 福袋状态：发放中 / 已开奖 / 待发放 / 审核中 … */
  status: string
  /** 状态单元格的原始文本（可能带剩余时间，如「发放中 02:31」） */
  statusText: string
  /** 发放时间 */
  sendTime: string
}

/** 本场直播优惠券列表中的一张 */
declare type CouponInfo = {
  /** 在列表中的序号（1 起，按界面顺序） */
  index: number
  /** 优惠券名称 */
  name: string
  /** 状态文本，如「发放中 02:31」「本场已发放 67 次」 */
  status: string
  /** 是否正在发放中（此时行内操作按钮为「停止发券」） */
  sending: boolean
  /** 满减额度，如「满100减10」 */
  amount: string
  /** 总库存，如「1000张」 */
  totalStock: string
  /** 当前可用库存，如「588张」 */
  availableStock: string
}

/** 发放优惠券的参数 */
declare type SendCouponParams = {
  /** 目标券名称（用于在列表中定位） */
  couponName: string
  /** 发券数量选项，如「50张」「全部库存」「自定义」 */
  count: string
  /** 发券时长选项，如「5分钟」「自定义」 */
  duration: string
  /** 目标券当前正在发放中时，是否先「停止发券」再重新发放 */
  restop?: boolean
}

/** 发放福袋的参数 */
declare type SendGiftBagParams = {
  /** 目标福袋模板序号（对应 GiftBagTemplate.index） */
  index: number
}

/**
 * 发放福袋的结果。
 * 提交前会从表单里读一次当前选中的时长，供营销循环估算「下次什么时候再检查」。
 */
declare type SendGiftBagResult = {
  /** 表单里读到的时长文本，如「5分钟」；没读到为 null */
  durationText: string | null
  /** 时长的毫秒数；没读到为 null */
  durationMs: number | null
  /**
   * 提交后是否在福袋列表里确认到「新增了一条」。
   * - true  → 确实创建成功
   * - false → 提交动作已完成，但列表没刷新出新增（可能只是列表未及时刷新，不代表失败）
   * 调用方据此决定是「按发放时长等待」还是「按轮询间隔尽快复查」。
   */
  verified: boolean
}

/**
 * 营销循环（状态驱动）：
 * - 福袋：检测到当前没有「发放中」的福袋时，才复制并提交指定序号的模板；
 * - 优惠券：检测到目标券不再「发放中」且还有可用库存时，才自动发放。
 */
declare type MarketingLoopConfig = {
  scheduler: {
    /** 轮询间隔 [min, max] 毫秒 */
    interval: [number, number]
  }
  /** 最多执行次数，0 或未设置表示无限循环 */
  maxRuns?: number
  /** 福袋循环配置 */
  giftBag?: {
    enabled: boolean
    /** 目标福袋模板序号（对应 GiftBagTemplate.index） */
    index: number
  }
  /** 优惠券循环配置（params 与手动发放一致） */
  coupon?: {
    enabled: boolean
    params: SendCouponParams
  }
}

declare type MarketingLoopTask = {
  type: 'marketing-loop'
  config: MarketingLoopConfig
}
