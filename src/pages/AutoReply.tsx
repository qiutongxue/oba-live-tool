import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAutoReply } from '@/hooks/useAutoReply'
import { useLiveControl } from '@/hooks/useLiveControl'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

export default function AutoReply() {
  const {
    isRunning,
    comments,
    startAutoReply,
    setIsRunning,
  } = useAutoReply()
  const { isConnected } = useLiveControl()

  useEffect(() => {
    if (isConnected && !isRunning) {
      setIsRunning(true)
      startAutoReply()
    }
  }, [isRunning, isConnected, startAutoReply, setIsRunning])

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">自动回复</h1>
        <p className="text-muted-foreground mt-2">
          查看直播间的实时评论
        </p>
      </div>

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
                      className="group px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors"
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
                      <span className="mx-1.5 text-gray-400">·</span>
                      <span className="text-gray-700">{comment.content}</span>
                    </div>
                  ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
