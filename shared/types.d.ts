type LiveControlPlatform = 'douyin' | 'buyin' | 'eos' | 'redbook'

type DouyinLiveMessage = {
  time: string
  msg_type:
    | 'comment'
    | 'room_enter'
    | 'room_like'
    | 'room_follow'
    | 'subscribe_merchant_brand_vip'
    | 'live_order'
    | 'ecom_fansclub_participate'
  msg_id: string
  nick_name: string
  content?: string
  user_id?: string
  // 订单相关字段
  order_status?: number
  order_ts?: number
  product_id?: string
  product_title?: string
}
