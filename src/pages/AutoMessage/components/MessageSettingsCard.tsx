import { useMemoizedFn } from 'ahooks'
import React, { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoMessageActions, useCurrentAutoMessage } from '@/hooks/useAutoMessage'

const MessageSettingsCard = React.memo(() => {
  const { scheduler, random, extraSpaces, unlimitedLength } = useCurrentAutoMessage(
    context => context.config,
  )
  const { setScheduler, setRandom, setExtraSpaces, setUnlimitedLength } = useAutoMessageActions()
  const randomId = useId()
  const extraSpacesId = useId()
  const unlimitedLengthId = useId()
  const [showWarning, setShowWarning] = useState(false)

  const handleUnlimitedLengthChange = useMemoizedFn((checked: boolean) => {
    if (checked) {
      setShowWarning(true)
    } else {
      setUnlimitedLength(false)
    }
  })

  const handleConfirmUnlimited = useMemoizedFn(() => {
    setUnlimitedLength(true)
    setShowWarning(false)
  })

  const handleIntervalChange = useMemoizedFn((index: 0 | 1, value: string) => {
    const numValue = Number(value) * 1000
    setScheduler({
      interval: index === 0 ? [numValue, scheduler.interval[1]] : [scheduler.interval[0], numValue],
    })
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>发送设置</Label>
              <p className="text-sm text-muted-foreground">配置消息发送的相关选项</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id={randomId} checked={random} onCheckedChange={setRandom} />
              <Label htmlFor={randomId} className="cursor-pointer">
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
            <Switch id={extraSpacesId} checked={extraSpaces} onCheckedChange={setExtraSpaces} />
            <Label htmlFor={extraSpacesId} className="cursor-pointer">
              插入随机空格
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id={unlimitedLengthId}
              checked={unlimitedLength}
              onCheckedChange={handleUnlimitedLengthChange}
            />
            <Label htmlFor={unlimitedLengthId} className="cursor-pointer">
              解除字数限制
            </Label>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>警告</AlertDialogTitle>
            <AlertDialogDescription>
              解除字数限制后，将不再对消息内容进行字数限制。请确保您输入的内容能够在目标平台正常发布，过长的内容可能导致发送失败或被截断。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlimited}>确认解除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
})

export default MessageSettingsCard
