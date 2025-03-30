import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

// 从共享类型定义中导入消息类型
type Message = {
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

const getMessageColor = (type: Message['msg_type']) => {
  switch (type) {
    case 'comment':
      return 'text-foreground'
    case 'room_enter':
      return 'text-blue-500'
    case 'room_like':
      return 'text-pink-500'
    case 'room_follow':
      return 'text-purple-500'
    case 'subscribe_merchant_brand_vip':
      return 'text-amber-500'
    case 'live_order':
      return 'text-green-500'
    case 'ecom_fansclub_participate':
      return 'text-purple-500'
    default:
      return 'text-foreground'
  }
}

const getMessageText = (message: Message) => {
  switch (message.msg_type) {
    case 'comment':
      return message.content
    case 'room_enter':
      return '进入直播间'
    case 'room_like':
      return '点赞了直播间'
    case 'room_follow':
      return '关注了直播间'
    case 'subscribe_merchant_brand_vip':
      return '加入了品牌会员'
    case 'live_order':
      return message.product_title
    case 'ecom_fansclub_participate':
      return '加入了粉丝团'
    default:
      return '未知消息'
  }
}

const getOrderStatusText = (status: number) => {
  switch (status) {
    case 1:
      return '待支付'
    // case 2:
    //   return '已取消'
    case 3:
      return '已付款'
    // case 4:
    //   return '已退款'
    // case 5:
    //   return '部分退款'
    default:
      return '下单'
  }
}

const getOrderStatusColor = (status: number) => {
  switch (status) {
    case 0:
    case 1:
      return 'text-blue-500 bg-blue-50' // 待付款状态显示蓝色
    case 3:
      return 'text-green-500 bg-green-50' // 已付款状态显示绿色
    case 2:
    case 4:
      return 'text-red-500 bg-red-50' // 取消/退款状态显示红色
    case 5:
      return 'text-orange-500 bg-orange-50' // 部分退款状态显示橙色
    default:
      return 'text-foreground'
  }
}

const MessageItem = ({ message }: { message: Message }) => {
  const getMessageIcon = () => {
    switch (message.msg_type) {
      case 'comment':
        return '💬'
      case 'room_enter':
        return '👋'
      case 'room_like':
        return '❤️'
      case 'room_follow':
        return '⭐'
      case 'subscribe_merchant_brand_vip':
        return '🌟'
      case 'live_order':
        return '🛒'
      case 'ecom_fansclub_participate':
        return '🏆'
      default:
        return '📝'
    }
  }

  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-muted">
        {getMessageIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{message.nick_name}</span>
          {message.msg_type === 'live_order' && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs px-1.5 py-0',
                getOrderStatusColor(message.order_status || 0),
              )}
            >
              {getOrderStatusText(message.order_status || 0)}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {message.time}
          </span>
        </div>

        <div className="mt-0.5 text-sm">
          <p
            className={cn(
              getMessageColor(message.msg_type),
              message.msg_type === 'live_order' ? 'font-medium' : '',
            )}
          >
            {getMessageText(message)}
          </p>
        </div>
      </div>
    </div>
  )
}

// 进入直播间的临时消息组件
const EnterRoomMessage = ({ message }: { message: Message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 p-2 rounded-md bg-blue-50/80 border border-blue-100"
    >
      <span className="text-blue-500">👋</span>
      <span className="font-medium">{message.nick_name}</span>
      <span className="text-sm text-blue-500">进入直播间</span>
    </motion.div>
  )
}

export default function Messages() {
  const [permanentMessages, setPermanentMessages] = useState<Message[]>([])
  const [tempMessages, setTempMessages] = useState<Message[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // 自动滚动到顶部
  // biome-ignore lint/correctness/useExhaustiveDependencies: 需要 permanentMessages 变化时自动滚动到顶部
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector(
        '[data-radix-scroll-area-viewport]',
      )
      if (scrollElement) {
        scrollElement.scrollTop = 0
      }
    }
  }, [permanentMessages, autoScroll])

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(
      IPC_CHANNELS.tasks.autoReplyPlus.message,
      ({ accountId, message }) => {
        console.log(message)
        if (message) {
          const newMessage = {
            ...message,
            time: new Date().toLocaleTimeString(),
          }

          if (message.msg_type === 'room_enter') {
            // 处理临时消息
            setTempMessages(prev => [...prev, newMessage])
            // 3秒后移除该消息
            setTimeout(() => {
              setTempMessages(prev =>
                prev.filter(msg => msg.msg_id !== newMessage.msg_id),
              )
            }, 3000)
          } else {
            // 处理永久消息 - 新消息添加到数组开头
            setPermanentMessages(prev => [newMessage, ...prev].slice(0, 100))
          }
        }
      },
    )

    return () => {
      removeListener()
    }
  }, [])

  return (
    <Card className="shadow-sm border-muted">
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">直播间消息</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {permanentMessages.length} 条消息
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-xs cursor-pointer',
              autoScroll ? 'bg-green-50 text-green-600' : '',
            )}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? '自动滚动' : '手动滚动'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent
        className="p-0"
        ref={scrollRef as React.RefObject<HTMLDivElement>}
      >
        <ScrollArea className="h-[500px]">
          {/* 临时消息区域 - 固定在顶部 */}
          <div className="sticky top-0 z-10 px-3 py-1 space-y-1">
            <AnimatePresence>
              {tempMessages.map(message => (
                <EnterRoomMessage key={message.msg_id} message={message} />
              ))}
            </AnimatePresence>
          </div>

          {/* 永久消息区域 */}
          <div className="py-2 space-y-0.5">
            {permanentMessages.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                暂无消息
              </div>
            ) : (
              permanentMessages.map(message => (
                <MessageItem key={message.msg_id} message={message} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
