import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoPopUpActions, useCurrentAutoPopUp } from '@/hooks/useAutoPopUp'
import { useToast } from '@/hooks/useToast'
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import { useMemoizedFn, useWhyDidYouUpdate } from 'ahooks'
import React, { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

const useTaskControl = () => {
  const isRunning = useCurrentAutoPopUp(context => context.isRunning)
  const config = useCurrentAutoPopUp(context => context.config)
  const { setIsRunning } = useAutoPopUpActions()
  const { toast } = useToast()

  const onStartTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoPopUp.start,
      config,
    )
    if (result) {
      setIsRunning(true)
      toast.success('自动弹窗任务已启动')
    } else {
      setIsRunning(false)
      toast.error('自动弹窗任务启动失败')
    }
  }, [config, setIsRunning, toast])

  const onStopTask = useCallback(async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.stop)
    setIsRunning(false)
  }, [setIsRunning])

  return {
    isRunning,
    onStartTask,
    onStopTask,
  }
}

export default function AutoPopUp() {
  const { isRunning, onStartTask, onStopTask } = useTaskControl()
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleTaskButtonClick = useMemoizedFn(() => {
    if (!isRunning) onStartTask()
    else onStopTask()
  })

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="自动弹窗" description="配置自动弹出商品的规则" />
        <TaskButton
          isTaskRunning={isRunning}
          onStartStop={handleTaskButtonClick}
        />
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <GoodsListCard onValidationError={setValidationError} />
        <PopUpSettingsCard />
      </div>
    </div>
  )
}

// 商品列表卡片组件
const GoodsListCard = React.memo(function GoodsListCard({
  onValidationError,
}: {
  onValidationError: (info: string | null) => void
}) {
  const goodsIds = useCurrentAutoPopUp(context => context.config.goodsIds)
  const { setGoodsIds } = useAutoPopUpActions()
  const handleGoodsIdChange = useMemoizedFn((index: number, value: string) => {
    const numValue = Number(value)
    if (Number.isNaN(numValue) || numValue < 1) {
      onValidationError('请输入有效的商品ID')
      return
    }
    const newIds = [...goodsIds]
    if (newIds.includes(numValue)) {
      onValidationError('商品ID不能重复！')
      return
    }
    newIds[index] = numValue

    onValidationError(null)
    setGoodsIds(newIds)
  })

  const addGoodsId = useMemoizedFn(() => {
    let id = 1
    while (goodsIds.includes(id)) id += 1
    setGoodsIds([...goodsIds, id])
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>商品列表</Label>
              <p className="text-sm text-muted-foreground">
                添加需要自动弹出的商品ID
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addGoodsId}>
              <PlusIcon className="mr-2 h-4 w-4" />
              添加商品
            </Button>
          </div>

          <div className="space-y-4">
            {goodsIds.map((id, index) => (
              <GoodsListItem
                key={id}
                id={id}
                index={index}
                onChange={handleGoodsIdChange}
                onDelete={() => {
                  const newGoodsIds = goodsIds.filter((_, i) => i !== index)
                  setGoodsIds(newGoodsIds)
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

// 商品列表项组件
const GoodsListItem = React.memo(function GoodsListItem({
  id,
  index,
  onChange,
  onDelete,
}: {
  id: number
  index: number
  onChange: (index: number, value: string) => void
  onDelete: () => void
}) {
  return (
    <div className="flex gap-3 items-center group">
      <Input
        type="number"
        value={id}
        onChange={e => onChange(index, e.target.value)}
        className="w-32"
        min="1"
        placeholder="商品ID"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  )
})

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
