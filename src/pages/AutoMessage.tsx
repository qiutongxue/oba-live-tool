import { TaskOperationButtons } from '@/components/TaskOperationButtons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoMessage } from '@/hooks/useAutoMessage'
import { useLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import React, { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

export default function AutoMessage() {
  const { isConnected } = useLiveControl()
  const { hasChanges, saveConfig, store } = useAutoMessage()
  const { toast } = useToast()
  const [validationError] = useState<string | null>(null)

  const onStartTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoMessage.start, store.config)
    if (result) {
      store.setIsRunning(true)
      toast.success('自动消息任务已启动')
    }

    else {
      store.setIsRunning(false)
      toast.error('自动消息任务启动失败')
    }
  }, [store, toast])

  const onStopTask = useCallback(async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoMessage.stop)
    store.setIsRunning(false)
  }, [store])

  const handleMessageChange = (index: number, value: string) => {
    if (value.length > 50)
      return // 不允许输入超过50个字符

    const newMessages = [...store.config.messages]
    newMessages[index] = value
    store.setMessages(newMessages)
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">自动发言</h1>
        <p className="text-muted-foreground">
          配置自动发送消息的规则。
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>消息列表</Label>
                  <p className="text-sm text-muted-foreground">
                    添加需要自动发送的消息内容
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => store.setMessages([...store.config.messages, ''])}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  添加消息
                </Button>
              </div>

              <div className="space-y-4">
                {store.config.messages.map((message, index) => (
                  <div key={message} className="flex gap-3 items-start group">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={message}
                        onChange={e => handleMessageChange(index, e.target.value)}
                        className={message.length > 50 ? 'border-destructive' : ''}
                        placeholder="输入消息内容"
                      />
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`pin-${index}`}
                            checked={store.config.pinTops.includes(index)}
                            onCheckedChange={(checked) => {
                              const newPinTops = checked
                                ? [...store.config.pinTops, index]
                                : store.config.pinTops.filter(i => i !== index)
                              store.setPinTops(newPinTops)
                            }}
                          />
                          <label
                            htmlFor={`pin-${index}`}
                            className="text-sm text-muted-foreground cursor-pointer select-none"
                          >
                            置顶此消息
                          </label>
                        </div>
                        <span className={`text-xs ${
                          message.length > 50 ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                        >
                          {message.length}
                          /50
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newMessages = store.config.messages.filter((_, i) => i !== index)
                        store.setMessages(newMessages)
                      }}
                      className="opacity-0 group-hover:opacity-100 self-start"
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
                  <Label>发送设置</Label>
                  <p className="text-sm text-muted-foreground">
                    配置消息发送的相关选项
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="random"
                    checked={store.config.random}
                    onCheckedChange={checked => store.setRandom(checked)}
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
                  系统将在设定的时间区间内随机选择发送时机
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TaskOperationButtons
        hasChanges={hasChanges}
        isConnected={isConnected}
        isTaskRunning={store.isRunning}
        onSave={saveConfig}
        onStartStop={store.isRunning ? onStopTask : onStartTask}
      />
    </div>
  )
}
