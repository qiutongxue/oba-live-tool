import { useMemoizedFn } from 'ahooks'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useCommentScrollActions, useCurrentCommentScroll } from '@/hooks/useCommentScroll'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'

/**
 * 「评论列表自动滚动」开关。
 *
 * 场景：eos 中控台的「评论管理」偶尔会停止自动跟随新消息，
 * 看到的弹幕会一直停在某个时间段。开启后任务会周期性把列表滚到底部。
 */
const CommentScrollCard = () => {
  const isConnected = useCurrentLiveControl(state => state.isConnected)
  const connected = isConnected === 'connected'

  const isRunning = useCurrentCommentScroll(context => context.isRunning)
  const { start, stop } = useCommentScrollActions()
  const [pending, setPending] = useState(false)

  const handleToggle = useMemoizedFn(async (next: boolean) => {
    setPending(true)
    try {
      if (next) await start()
      else await stop()
    } finally {
      setPending(false)
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              评论列表自动滚动
              {isRunning && (
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                  title="自动滚动运行中"
                />
              )}
            </CardTitle>
            <CardDescription>
              中控台的「评论管理」有时会停止自动跟随新消息，看到的弹幕会一直停留在某个时间段。
              开启后会每隔几秒把列表滚到底部，始终显示最新弹幕。
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <Switch
              checked={isRunning}
              onCheckedChange={handleToggle}
              disabled={pending || (!connected && !isRunning)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {!connected && !isRunning
            ? '需要先连接直播控制台才能开启。'
            : isRunning
              ? '运行中：大约每 2.5~4 秒滚动一次；停止后不再干预页面。'
              : '未开启。开启期间与自动弹窗、营销循环共用同一页面，操作会自动排队，不会互相打断。'}
        </p>
      </CardContent>
    </Card>
  )
}

export default CommentScrollCard
