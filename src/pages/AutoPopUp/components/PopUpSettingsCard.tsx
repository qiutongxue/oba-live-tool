import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoPopUpActions, useCurrentAutoPopUp } from '@/hooks/useAutoPopUp'
import { useMemoizedFn } from 'ahooks'
import React from 'react'

// 弹窗设置卡片组件
const PopUpSettingsCard = React.memo(() => {
  const { scheduler, random } = useCurrentAutoPopUp(context => context.config)
  const { setScheduler, setRandom } = useAutoPopUpActions()

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
              <Label>弹窗设置</Label>
              <p className="text-sm text-muted-foreground">
                配置商品弹窗的相关选项
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="random"
                checked={random}
                onCheckedChange={setRandom}
              />
              <Label htmlFor="random" className="cursor-pointer">
                随机弹窗
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label>弹窗间隔（秒）</Label>
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
              系统将在设定的时间区间内随机选择弹窗时机
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default PopUpSettingsCard
