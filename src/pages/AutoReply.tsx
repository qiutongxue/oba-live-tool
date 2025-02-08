import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAutoReply } from '@/hooks/useAutoReply'
import { PlayIcon, StopIcon } from '@radix-ui/react-icons'

export default function AutoReply() {
  const {
    isRunning,
    comments,
    startAutoReply,
    stopAutoReply,
    formatTime,
  } = useAutoReply()

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">自动回复</h1>
            <p className="text-muted-foreground mt-2">
              查看直播间的实时评论
            </p>
          </div>
          <Button
            onClick={isRunning ? stopAutoReply : startAutoReply}
            variant={isRunning ? 'destructive' : 'default'}
          >
            {isRunning
              ? (
                  <>
                    <StopIcon className="mr-2 h-4 w-4" />
                    停止监听
                  </>
                )
              : (
                  <>
                    <PlayIcon className="mr-2 h-4 w-4" />
                    开始监听
                  </>
                )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>评论列表</CardTitle>
          <CardDescription>显示最近的100条评论</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comments.length === 0
              ? (
                  <div className="text-center text-muted-foreground py-8">
                    暂无评论数据
                  </div>
                )
              : comments.map((comment, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg border"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{comment.nickname}</span>
                        {comment.authorTags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                        {comment.commentTags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {formatTime(comment.timestamp)}
                    </time>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
