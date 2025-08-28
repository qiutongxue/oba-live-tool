import { motion } from 'framer-motion'
import { Pause, Play, RefreshCcw } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
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
import { useAccounts } from '@/hooks/useAccounts'
import { type Message, useAutoReply } from '@/hooks/useAutoReply'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

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

const getOrderStatusColor = (status: LiveOrderMessage['order_status']) => {
  switch (status) {
    case '已下单':
      return 'text-blue-500 bg-blue-50' // 待付款状态显示蓝色
    case '已付款':
      return 'text-green-500 bg-green-50' // 已付款状态显示绿色
    default:
      return 'text-foreground'
  }
}

const MessageItem = ({
  message,
  isHighlighted,
}: {
  message: Message
  isHighlighted: boolean
}) => {
  const displayName = message.nick_name

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors',
        isHighlighted ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-muted/50',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-muted-foreground">
            {displayName}
          </span>
          {message.msg_type === 'live_order' && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs px-1.5 py-0',
                getOrderStatusColor(message.order_status),
              )}
            >
              {message.order_status}
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

const _EnterRoomMessage = ({ message }: { message: Message }) => {
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

export default function CommentList({
  highlight: highlightedCommentId,
}: {
  highlight: string | null
}) {
  const { comments, isListening, setIsListening, config } = useAutoReply()
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const platform = useCurrentLiveControl(context => context.platform)
  const { toast } = useToast()
  const [hideHost, setHideHost] = useState(false)
  const { currentAccountId } = useAccounts()

  // 手动启动监听评论
  const startListening = async () => {
    if (isConnected !== 'connected') {
      toast.error('请先连接直播间')
      return
    }

    try {
      setIsListening('waiting')
      const result = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReply.startCommentListener,
        currentAccountId,
        {
          source: config.entry,
          ws: config.ws?.enable ? { port: config.ws.port } : undefined,
        },
      )
      if (!result) throw new Error('监听评论失败')
      toast.success('监听评论成功')
      setIsListening('listening')
    } catch (_error) {
      setIsListening('error')
      toast.error('监听评论失败')
    }
  }

  // 手动停止监听评论
  const stopListening = async () => {
    try {
      await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReply.stopCommentListener,
        currentAccountId,
      )
      setIsListening('stopped')
      toast.success('已停止监听评论')
    } catch (_error) {
      toast.error('停止监听评论失败')
    }
  }

  const accountName = useCurrentLiveControl(ctx => ctx.accountName)

  const filteredComments = useMemo(
    () =>
      hideHost
        ? comments.filter(comment => comment.nick_name !== accountName)
        : comments,
    [comments, hideHost, accountName],
  )

  const isButtonDisabled =
    isListening === 'waiting' ||
    isConnected !== 'connected' ||
    (platform !== 'douyin' && platform !== 'buyin')

  const userCommentOnlyId = useId()

  return (
    <Card className="shadow-sm">
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
              title={
                isListening === 'waiting' || isConnected !== 'connected'
                  ? '请先连接直播间'
                  : undefined
              }
              disabled={isButtonDisabled}
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

          {isConnected === 'connected' && (
            <>
              {isListening === 'error' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startListening}
                  title="重试"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              )}

              {isListening === 'listening' && (
                <div className="flex items-center gap-2 ml-2">
                  <Switch
                    id={userCommentOnlyId}
                    checked={hideHost}
                    onCheckedChange={setHideHost}
                  />
                  <Label htmlFor={userCommentOnlyId}>仅用户评论</Label>
                </div>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="py-2 space-y-0.5">
            {filteredComments.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                {isListening === 'listening'
                  ? '暂无评论数据'
                  : '请点击"开始监听"按钮开始接收评论'}
              </div>
            ) : (
              filteredComments.map(comment => (
                <MessageItem
                  key={comment.msg_id}
                  message={comment}
                  // isHost={comment.nick_name === accountName}
                  isHighlighted={highlightedCommentId === comment.msg_id}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
