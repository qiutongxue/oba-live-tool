import { TaskOperationButtons } from '@/components/TaskOperationButtons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoPopUp } from '@/hooks/useAutoPopUp'
import { useLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import React, { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

export default function AutoPopUp() {
  const { isConnected } = useLiveControl()
  const { store, saveConfig, hasChanges } = useAutoPopUp()
  const [validationError, setValidationError] = useState<string | null>(null)
  const { toast } = useToast()

  const configValidator = useCallback(() => {
    if (store.config.enabled && store.config.goodsIds.length === 0) {
      setValidationError('请至少添加一个商品ID')
      return false
    }
    const uniqueGoodsIds = new Set(store.config.goodsIds)
    if (uniqueGoodsIds.size !== store.config.goodsIds.length) {
      setValidationError('商品ID不能重复！')
      return false
    }
    setValidationError(null)
    return true
  }, [store.config.goodsIds, store.config.enabled])

  const onStartTask = useCallback(async () => {
    if (!configValidator())
      return
    const result = await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.start, store.config)
    if (result) {
      store.setIsRunning(true)
      toast.success('自动弹窗任务已启动')
    }

    else {
      store.setIsRunning(false)
      toast.error('自动弹窗任务启动失败')
    }
  }, [store, toast, configValidator])

  const onStopTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.stop)
    if (result) {
      store.setIsRunning(false)
      toast.success('自动弹窗任务已停止')
    }
    else {
      toast.error('自动弹窗任务停止失败')
    }
  }, [store, toast])

  const handleGoodsIdChange = (index: number, value: string) => {
    const numValue = Number(value)
    if (Number.isNaN(numValue) || numValue < 1) {
      setValidationError('请输入有效的商品ID')
      return
    }
    const newIds = [...store.config.goodsIds]
    if (newIds.includes(numValue)) {
      setValidationError('商品ID不能重复！')
      return
    }
    newIds[index] = numValue

    setValidationError(null)
    store.setGoodsIds(newIds)
  }

  const addGoodsId = useCallback(() => {
    let id = 1
    while (store.config.goodsIds.includes(id)) {
      id += 1
    }
    store.setGoodsIds([...store.config.goodsIds, id])
  }, [store])

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">自动弹窗</h1>
        <p className="text-muted-foreground">
          配置自动弹出商品的规则。
        </p>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>启用自动弹窗</Label>
                <p className="text-sm text-muted-foreground">
                  开启后将按照设定的规则自动弹出商品
                </p>
              </div>
              <Switch
                checked={store.config.enabled}
                onCheckedChange={checked => store.setConfig({
                  ...store.config,
                  enabled: checked,
                })}
              />
            </div>
          </CardContent>
        </Card>

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
                {store.config.goodsIds.map((id, index) => (
                  <div key={id} className="flex gap-3 items-center group">
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
                        const newGoodsIds = store.config.goodsIds.filter((_, i) => i !== index)
                        store.setGoodsIds(newGoodsIds)
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
                    checked={store.config.random}
                    onCheckedChange={checked => store.setRandom(checked)}
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
                    value={store.config.scheduler.interval[0] / 1000}
                    onChange={e => store.setScheduler({
                      interval: [Number(e.target.value) * 1000, store.config.scheduler.interval[1]],
                    })}
                    className="w-24"
                    min="1"
                    placeholder="最小"
                  />
                  <span className="text-sm text-muted-foreground">至</span>
                  <Input
                    type="number"
                    value={store.config.scheduler.interval[1] / 1000}
                    onChange={e => store.setScheduler({
                      interval: [store.config.scheduler.interval[0], Number(e.target.value) * 1000],
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

      <TaskOperationButtons
        validationError={validationError}
        hasChanges={hasChanges}
        isConnected={isConnected}
        isTaskRunning={store.isRunning}
        onSave={saveConfig}
        onStartStop={store.isRunning ? onStopTask : onStartTask}
      />
    </div>
  )
}
