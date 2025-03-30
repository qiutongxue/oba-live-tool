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
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { Pause, Play, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

// 评论项组件
const CommentItem = ({
  comment,
  isHost,
  isHighlighted,
}: {
  comment: { id: string; nickname: string; content: string }
  isHost: boolean
  isHighlighted: boolean
}) => {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-3 py-2 rounded-lg transition-colors',
        isHighlighted ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-muted/50',
      )}
    >
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', 'text-gray-500')}>
          {/* {isHost && (
            <span className="mr-1.5 font-normal text-xs px-1.5 py-0.5 rounded-sm bg-pink-50 text-pink-600 border border-pink-200">
              主播
            </span> 
          )} */}
          {comment.nickname}：
        </span>
        <span className="text-sm text-gray-700">{comment.content}</span>
      </div>
    </div>
  )
}

export default function CommentList({
  highlight: highlightedCommentId,
}: {
  highlight: string | null
}) {
  const { comments, isListening, setIsListening } = useAutoReply()
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const { toast } = useToast()
  const [hideHost, setHideHost] = useState(false)

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
      )
      if (!result) throw new Error('监听评论失败')
      toast.success('监听评论成功')
      setIsListening('listening')
    } catch (error) {
      setIsListening('error')
      toast.error('监听评论失败')
    }
  }

  // 手动停止监听评论
  const stopListening = async () => {
    try {
      await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReply.stopCommentListener,
      )
      setIsListening('stopped')
      toast.success('已停止监听评论')
    } catch (error) {
      toast.error('停止监听评论失败')
    }
  }

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(
      IPC_CHANNELS.tasks.autoReply.stopCommentListener,
      () => {
        setIsListening('stopped')
      },
    )
    return () => {
      removeListener()
    }
  }, [setIsListening])

  const accountName = useCurrentLiveControl(ctx => ctx.accountName)

  const filteredComments = useMemo(
    () =>
      hideHost
        ? comments.filter(comment => comment.nickname !== accountName)
        : comments,
    [comments, hideHost, accountName],
  )

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
                    id="hide-host"
                    checked={hideHost}
                    onCheckedChange={setHideHost}
                  />
                  <Label htmlFor="hide-host">仅用户评论</Label>
                </div>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="py-2 space-y-0.5">
            {filteredComments.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground">
                {isListening === 'listening'
                  ? '暂无评论数据'
                  : '请点击"开始监听"按钮开始接收评论'}
              </div>
            ) : (
              filteredComments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isHost={comment.nickname === accountName}
                  isHighlighted={highlightedCommentId === comment.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
