import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAutoReply } from '@/hooks/useAutoReply'
import { type Message, useAutoReplyPlus } from '@/hooks/useAutoReplyPlus'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { useMemoizedFn } from 'ahooks'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import SettingsDialog from './Settings'

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
    case 0:
      return '下单'
    case 1:
      return '待支付'
    case 2:
      return '已取消'
    case 3:
      return '已付款'
    case 4:
      return '已退款'
    case 5:
      return '部分退款'
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

const MessageItem = ({
  message,
  hideUserName,
}: { message: Message; hideUserName: boolean }) => {
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

  const displayName = message.nick_name

  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{displayName}</span>
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
const EnterRoomMessage = ({
  message,
  hideUserName,
}: { message: Message; hideUserName: boolean }) => {
  const displayName = message.nick_name

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 p-2 rounded-md bg-blue-50/80 border border-blue-100"
    >
      <span className="font-medium">{displayName}</span>
      <span className="text-sm text-blue-500">进入直播间</span>
    </motion.div>
  )
}

export default function Messages() {
  const { messages, addMessage, settings } = useAutoReplyPlus()
  const [tempMessages, setTempMessages] = useState<Message[]>([])
  // const scrollRef = useRef<HTMLDivElement | null>(null)
  const { isListening, setIsListening } = useAutoReply()
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const [hideHost, setHideHost] = useState(false)
  const { toast } = useToast()
  const accountName = useCurrentLiveControl(context => context.accountName)

  const stopListening = async () => {
    try {
      // 停止监听
      await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReplyPlus.stopCommentListener,
      )
    } catch (error) {
      console.error('停止监听失败', error)
    } finally {
      setIsListening('stopped')
    }
  }

  const startListening = async () => {
    try {
      // 监听开始
      await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReplyPlus.startCommentListener,
      )
      setIsListening('listening')
    } catch (error) {
      console.error('启动大屏监听失败', error)
    }
  }

  // 发送自动回复消息
  const sendAutoReply = useMemoizedFn(async (nickname: string) => {
    if (!settings.autoReplyRoomEnter || settings.roomEnterMessages.length === 0)
      return

    try {
      // 随机选择一条消息
      const randomIndex = Math.floor(
        Math.random() * settings.roomEnterMessages.length,
      )
      const message = settings.roomEnterMessages[randomIndex]
      const finalNickname = settings.hideUserName
        ? String.fromCodePoint(nickname.codePointAt(0) ?? 42 /* 42 是“*” */)
        : nickname
      // 替换消息中的 {用户名} 变量
      const finalMessage = `@${finalNickname} ${message}`

      // 发送消息
      console.log('发送消息', finalMessage)
      await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReply.sendReply,
        finalMessage,
      )

      toast.success('已发送欢迎消息')
    } catch (error) {
      console.error('发送欢迎消息失败', error)
    }
  })

  const filteredComments = useMemo(
    () =>
      hideHost
        ? messages.filter(message => message.nick_name !== accountName)
        : messages,
    [messages, hideHost, accountName],
  )

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(
      IPC_CHANNELS.tasks.autoReplyPlus.message,
      ({ accountId, message }) => {
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

            // 如果开启了自动回复，发送欢迎消息
            if (settings.autoReplyRoomEnter) {
              sendAutoReply(message.nick_name)
            }
          } else {
            // 处理永久消息 - 新消息添加到数组开头
            addMessage(newMessage)
          }
        }
      },
    )

    return () => {
      removeListener()
    }
  }, [addMessage, settings.autoReplyRoomEnter, sendAutoReply])

  return (
    <Card className="shadow-sm border-muted">
      <CardHeader className="pb-3 relative">
        <CardTitle>评论列表</CardTitle>
        <CardDescription>实时显示直播间的评论内容</CardDescription>
        <div className="flex items-center space-x-2 absolute right-4 top-4">
          {isListening === 'listening' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopListening}
              className="flex items-center gap-1"
            >
              <Pause className="h-4 w-4" />
              停止监听
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startListening}
              className="flex items-center gap-1"
              disabled={
                isListening === 'waiting' || isConnected !== 'connected'
              }
            >
              {isListening === 'waiting' ? (
                '连接中...'
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  开始监听
                </>
              )}
            </Button>
          )}

          {isListening === 'listening' && (
            <div className="flex items-center gap-2 ml-2">
              <Switch
                id="hide-host"
                checked={hideHost}
                onCheckedChange={setHideHost}
              />
              <Label htmlFor="hide-host">仅用户评论</Label>
            </div>
          )}
        </div>
      </CardHeader>
      <Separator />

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {/* 临时消息区域 - 固定在顶部 */}
          <div className="sticky top-0 z-10 px-3 py-1 space-y-1">
            <AnimatePresence>
              {tempMessages.map(message => (
                <EnterRoomMessage
                  key={message.msg_id}
                  message={message}
                  hideUserName={settings.hideUserName}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* 永久消息区域 */}
          <div className="py-2 space-y-0.5">
            {filteredComments.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                暂无消息
              </div>
            ) : (
              filteredComments.map(message => (
                <MessageItem
                  key={message.msg_id}
                  message={message}
                  hideUserName={settings.hideUserName}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
