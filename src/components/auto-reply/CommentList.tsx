import { useAutoReply } from '@/hooks/useAutoReply'
import { useLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { Switch } from '../ui/switch'

export default function CommentList({ highlight: highlightedCommentId }: { highlight: string | null }) {
  const { comments, isListening, setIsListening } = useAutoReply()
  const { isConnected } = useLiveControl()
  const { toast } = useToast()
  const [hideHost, setHideHost] = useState(false)

  useEffect(() => {
    if (isConnected && !isListening) {
      window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReply.startCommentListener,
      ).then((result) => {
        if (!result)
          throw new Error('监听评论失败')
        toast.success('监听评论成功')
        setIsListening(true)
      }).catch(() => {
        toast.error('监听评论失败')
      })
    }
  }, [isConnected, isListening, setIsListening, toast])

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(
      IPC_CHANNELS.tasks.autoReply.stopCommentListener,
      () => {
        setIsListening(false)
      },
    )
    return () => {
      removeListener()
    }
  }, [setIsListening])

  const filteredComments = hideHost
    ? comments.filter(comment => comment.authorTags.length === 0)
    : comments

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>评论列表</CardTitle>
            <CardDescription>实时显示直播间的评论内容</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-host"
              checked={hideHost}
              onCheckedChange={setHideHost}
            />
            <Label htmlFor="hide-host">用户评论</Label>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent>
        <ScrollArea className="py-2 h-[600px]">
          <div className="space-y-1">
            {filteredComments.length === 0
              ? (
                  <div className="text-center text-muted-foreground py-8">
                    暂无评论数据
                  </div>
                )
              : filteredComments.map(comment => (
                  <div
                    key={comment.id}
                    className={cn(
                      'group px-3 py-1.5 text-sm rounded-lg transition-colors',
                      highlightedCommentId === comment.id
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    {/* 标签区域 */}
                    {[...comment.authorTags, ...comment.commentTags].map(tag => (
                      <span
                        key={`${comment.id}-${tag}`}
                        className={cn(
                          'mr-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                          // 主播标签
                          tag === '主播' && 'bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-700/10',
                          // 评论标签
                          comment.commentTags.includes(tag) && 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
                          // 其他作者标签
                          !comment.commentTags.includes(tag) && tag !== '主播' && 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10',
                        )}
                      >
                        {tag}
                      </span>
                    ))}

                    {/* 昵称和内容 */}
                    <span className="font-medium text-gray-900">
                      {comment.nickname}
                    </span>
                    <span className="mx-1.5 text-gray-400">: </span>
                    <span className="text-gray-700">{comment.content}</span>
                  </div>
                ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
