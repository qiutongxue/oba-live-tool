import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  useAutoMessageActions,
  useCurrentAutoMessage,
} from '@/hooks/useAutoMessage'
import { useMemoizedFn } from 'ahooks'
import React from 'react'

const MessageSettingsCard = React.memo(() => {
  const { scheduler, random, extraSpaces } = useCurrentAutoMessage(
    context => context.config,
  )
  const { setScheduler, setRandom, setExtraSpaces } = useAutoMessageActions()

  const handleIntervalChange = useMemoizedFn((index: 0 | 1, value: string) => {
    const numValue = Number(value) * 1000
    setScheduler({
      interval:
        index === 0
          ? [numValue, scheduler.interval[1]]
          : [scheduler.interval[0], numValue],
    })
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>发送设置</Label>
              <p className="text-sm text-muted-foreground">
                配置消息发送的相关选项
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="random"
                checked={random}
                onCheckedChange={setRandom}
              />
              <Label htmlFor="random" className="cursor-pointer">
                随机发送
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label>发送间隔（秒）</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={scheduler.interval[0] / 1000}
                onChange={e => handleIntervalChange(0, e.target.value)}
                className="w-24"
                min="1"
                placeholder="最小"
              />
              <span className="text-sm text-muted-foreground">至</span>
              <Input
                type="number"
                value={scheduler.interval[1] / 1000}
                onChange={e => handleIntervalChange(1, e.target.value)}
                className="w-24"
                min="1"
                placeholder="最大"
              />
              <span className="text-sm text-muted-foreground">秒</span>
            </div>
            <p className="text-xs text-muted-foreground">
              系统将在设定的时间区间内随机选择发送时机
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="extraSpaces"
              checked={extraSpaces}
              onCheckedChange={setExtraSpaces}
            />
            <Label htmlFor="extraSpaces" className="cursor-pointer">
              插入随机空格
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default MessageSettingsCard
