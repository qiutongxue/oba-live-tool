export function getRandomDouyinLiveMessage(): DouyinLiveMessage {
  const now = new Date().toISOString()
  const msg_id = Math.random().toString(36).substring(2, 10)
  const nick_name = ['小红', '大壮', '用户123', '测试用户', '阿狸'][
    Math.floor(Math.random() * 5)
  ]
  const user_id = Math.floor(Math.random() * 1000000).toString()
  const contentSamples = ['你好主播！', '真好看！', '已下单', '冲鸭', '关注了~']

  const types = [
    'comment',
    'room_enter',
    'room_like',
    'live_order',
    'subscribe_merchant_brand_vip',
    'room_follow',
    'ecom_fansclub_participate',
  ] as const

  const msg_type = types[Math.floor(Math.random() * types.length)]

  switch (msg_type) {
    case 'comment':
      return {
        time: now,
        msg_type,
        msg_id,
        nick_name,
        content:
          contentSamples[Math.floor(Math.random() * contentSamples.length)],
      }
    case 'room_enter':
      return {
        time: now,
        msg_type,
        msg_id,
        nick_name,
        user_id,
      }
    case 'room_like':
      return {
        time: now,
        msg_type,
        msg_id,
        nick_name,
        user_id,
      }
    case 'subscribe_merchant_brand_vip':
      return {
        time: now,
        msg_type,
        msg_id,
        nick_name,
        user_id,
        content: '开通了品牌会员！',
      }
    case 'room_follow':
      return {
        time: now,
        msg_type,
        msg_id,
        nick_name,
        user_id,
      }
    case 'ecom_fansclub_participate':
      return {
        time: now,
        msg_type,
        msg_id,
        nick_name,
        user_id,
        content: '加入粉丝团',
      }
    case 'live_order':
      return {
        time: now,
        msg_type,
        msg_id,
        nick_name,
        order_status: (['已下单', '已付款', '未知状态'] as const)[
          Math.floor(Math.random() * 3)
        ],
        order_ts: Date.now(),
        product_id: `pid_${Math.floor(Math.random() * 10000)}`,
        product_title: ['保温杯', '面膜', '美妆蛋', '手机支架'][
          Math.floor(Math.random() * 4)
        ],
      }
  }
}
