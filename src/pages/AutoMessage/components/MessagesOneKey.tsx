import { useMemo, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAutoMessageActions, useCurrentAutoMessage } from '@/hooks/useAutoMessage'
import { useConnectedTargetAccountIds } from '@/hooks/useMultiAccount'
import { useToast } from '@/hooks/useToast'

export function MessageOneKey() {
  const [isRunning, setIsRunning] = useState(false)
  const batchCount = useCurrentAutoMessage(ctx => ctx.batchCount ?? 5)
  const { setBatchCount } = useAutoMessageActions()
  const messages = useCurrentAutoMessage(ctx => ctx.config.messages)
  const targetAccountIds = useConnectedTargetAccountIds()
  const { toast } = useToast()

  const mappedMessages = useMemo(() => messages.map(msg => msg.content), [messages])

  const handleClick = async () => {
    if (targetAccountIds.length === 0) {
      toast.error('请先选择至少一个已连接的账号')
      return
    }
    setIsRunning(true)
    try {
      const results = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoMessage.sendBatchMessagesForAccounts,
        targetAccountIds,
        mappedMessages,
        batchCount,
      )
      const successCount = results.filter((result: { success: boolean }) => result.success).length
      if (successCount === results.length) {
        toast.success(`已在 ${successCount} 个账号上启动一键刷屏`)
      } else if (successCount > 0) {
        toast.error(`${successCount} 个账号启动成功，${results.length - successCount} 个失败（详见日志）`)
      } else {
        toast.error('一键刷屏启动失败（详见日志）')
      }
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>一键刷屏</Label>
              <p className="text-sm text-muted-foreground">
                连续发送多条评论（作用于已选中的 {targetAccountIds.length} 个账号）
              </p>
            </div>
            <div className="flex gap-4 justify-end">
              <Input
                placeholder="刷屏条数"
                type="number"
                value={batchCount}
                onChange={e => setBatchCount(+e.target.value)}
                className="w-24"
              />
              <Button
                onClick={handleClick}
                disabled={targetAccountIds.length === 0 || isRunning}
              >
                {isRunning ? '运行中' : '一键刷屏'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
