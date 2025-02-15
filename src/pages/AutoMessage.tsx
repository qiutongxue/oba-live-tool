import type { Message } from '@/hooks/useAutoMessage'
import MessageComp from '@/components/auto-message/MessageComp'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoMessage } from '@/hooks/useAutoMessage'
import { useToast } from '@/hooks/useToast'
import { PlusIcon } from '@radix-ui/react-icons'
import React, { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

export default function AutoMessage() {
  const { isRunning, config, setMessages, setRandom, setScheduler, setIsRunning } = useAutoMessage()
  const { toast } = useToast()
  const [validationError] = useState<string | null>(null)

  const onStartTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoMessage.start, config)
    if (result) {
      setIsRunning(true)
      toast.success('自动消息任务已启动')
    }
    else {
      setIsRunning(false)
      toast.error('自动消息任务启动失败')
    }
  }, [config, toast, setIsRunning])

  const onStopTask = useCallback(async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoMessage.stop)
    setIsRunning(false)
  }, [setIsRunning])

  const handleTaskButtonClick = () => {
    if (!isRunning)
      onStartTask()
    else
      onStopTask()
  }

  const handleMessageChange = (message: Message) => {
    setMessages(config.messages.map(m => m.id === message.id ? message : m))
  }

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="自动发言" description="配置自动发送消息的规则" />
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
                  onClick={() => setMessages([...config.messages, {
                    id: crypto.randomUUID(),
                    content: '',
                    pinTop: false,
                  }])}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  添加消息
                </Button>
              </div>

              <div className="space-y-4">
                {config.messages.map(message => (
                  <MessageComp
                    key={message.id}
                    message={message}
                    onChange={handleMessageChange}
                    onDelete={id => setMessages(config.messages.filter(m => m.id !== id))}
                  />
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
                    checked={config.random}
                    onCheckedChange={checked => setRandom(checked)}
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
                  系统将在设定的时间区间内随机选择发送时机
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
