import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import { PromptCard } from '@/components/auto-reply/PromptCard'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAutoReply, useAutoReplyStore } from '@/hooks/useAutoReply'
import { useComment } from '@/hooks/useComment'
import { useLiveControl } from '@/hooks/useLiveControl'
import { cn } from '@/lib/utils'
import { SendHorizontalIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

export default function AutoReply() {
  useAutoReply()
  const { isRunning: autoReplyEnabled, setIsRunning: setAutoReplyEnabled, replies } = useAutoReplyStore()
  const {
    isRunning,
    comments,
    startCommentListener,
  } = useComment()
  const { isConnected } = useLiveControl()
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected && !isRunning) {
      startCommentListener()
    }
  }, [isRunning, isConnected, startCommentListener])

  const handleAutoReplyToggle = async () => {
    try {
      setAutoReplyEnabled(!autoReplyEnabled)
    }
    catch (error) {
      console.error('切换自动回复失败:', error)
    }
  }

  const handleSendReply = async (replyContent: string, _commentId: string) => {
    try {
      await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoReply.sendReply, replyContent)
      // removeReply(commentId)
    }
    catch (error) {
      console.error('发送回复失败:', error)
    }
  }

  return (
    <div className="container py-8 space-y-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Title title="自动回复" description="查看直播间的实时评论并自动回复" />
          </div>
          <div className="flex items-center gap-2">
            <APIKeyDialog />
            <TaskButton
              isTaskRunning={autoReplyEnabled}
              onStartStop={handleAutoReplyToggle}
            />
          </div>
        </div>
      </div>

      {/* Prompt 配置卡片 */}
      <PromptCard />

      {/* 评论和回复区域 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 评论列表卡片 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>评论列表</CardTitle>
            <CardDescription>实时显示直播间的评论内容</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent>
            <ScrollArea className="py-2 h-[600px]">
              <div className="space-y-1">
                {comments.length === 0
                  ? (
                      <div className="text-center text-muted-foreground py-8">
                        暂无评论数据
                      </div>
                    )
                  : comments.map(comment => (
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

        {/* 回复预览卡片 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>回复预览</CardTitle>
            <CardDescription>AI 生成的回复内容</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent>
            <ScrollArea className="py-2 h-[600px]">
              <div className="space-y-1">
                {replies.length === 0
                  ? (
                      <div className="text-center text-muted-foreground py-8">
                        暂无回复数据
                      </div>
                    )
                  : replies.map((reply) => {
                      const relatedComment = comments.find(c => c.id === reply.commentId)
                      return (
                        <div
                          key={reply.commentId}
                          className="group px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors"
                          onMouseEnter={() => setHighlightedCommentId(reply.commentId)}
                          onMouseLeave={() => setHighlightedCommentId(null)}
                        >
                          <div className="flex flex-col gap-1">
                            {relatedComment && (
                              <div className="text-xs text-muted-foreground">
                                回复：
                                {relatedComment.nickname}
                                {' '}
                                -
                                {' '}
                                {relatedComment.content}
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-gray-700 flex-1">{reply.replyContent}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="invisible group-hover:visible h-6 w-6"
                                onClick={() => handleSendReply(reply.replyContent, reply.commentId)}
                              >
                                <SendHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
