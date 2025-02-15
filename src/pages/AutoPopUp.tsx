import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoPopUp } from '@/hooks/useAutoPopUp'
import { useToast } from '@/hooks/useToast'
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import React, { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

export default function AutoPopUp() {
  const { isRunning, config, setGoodsIds, setScheduler, setRandom, setIsRunning } = useAutoPopUp()
  const [validationError, setValidationError] = useState<string | null>(null)
  const { toast } = useToast()

  const onStartTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.start, config)
    if (result) {
      setIsRunning(true)
      toast.success('自动弹窗任务已启动')
    }
    else {
      setIsRunning(false)
      toast.error('自动弹窗任务启动失败')
    }
  }, [setIsRunning, config, toast])

  const onStopTask = useCallback(async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.stop)
    setIsRunning(false)
  }, [setIsRunning])

  const handleTaskButtonClick = () => {
    if (!isRunning)
      onStartTask()
    else
      onStopTask()
  }

  const handleGoodsIdChange = (index: number, value: string) => {
    const numValue = Number(value)
    if (Number.isNaN(numValue) || numValue < 1) {
      setValidationError('请输入有效的商品ID')
      return
    }
    const newIds = [...config.goodsIds]
    if (newIds.includes(numValue)) {
      setValidationError('商品ID不能重复！')
      return
    }
    newIds[index] = numValue

    setValidationError(null)
    setGoodsIds(newIds)
  }

  const addGoodsId = useCallback(() => {
    let id = 1
    while (config.goodsIds.includes(id))
      id += 1
    setGoodsIds([...config.goodsIds, id])
  }, [config.goodsIds, setGoodsIds])

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="自动弹窗" description="配置自动弹出商品的规则" />

        <div>
          <TaskButton
            isTaskRunning={isRunning}
            onStartStop={handleTaskButtonClick}
          />
        </div>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addGoodsId}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  添加商品
                </Button>
              </div>

              <div className="space-y-4">
                {config.goodsIds.map((id, index) => (
                  <div key={index} className="flex gap-3 items-center group">
                    <Input
                      type="number"
                      value={id}
                      onChange={e => handleGoodsIdChange(index, e.target.value)}
                      className="w-32"
                      min="1"
                      placeholder="商品ID"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newGoodsIds = config.goodsIds.filter((_, i) => i !== index)
                        setGoodsIds(newGoodsIds)
                      }}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
                    checked={config.random}
                    onCheckedChange={checked => setRandom(checked)}
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
                    value={config.scheduler.interval[0] / 1000}
                    onChange={e => setScheduler({
                      interval: [Number(e.target.value) * 1000, config.scheduler.interval[1]],
                    })}
                    className="w-24"
                    min="1"
                    placeholder="最小"
                  />
                  <span className="text-sm text-muted-foreground">至</span>
                  <Input
                    type="number"
                    value={config.scheduler.interval[1] / 1000}
                    onChange={e => setScheduler({
                      interval: [config.scheduler.interval[0], Number(e.target.value) * 1000],
                    })}
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
      </div>
    </div>
  )
}
