import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoReplyPlus } from '@/hooks/useAutoReplyPlus'
import { useToast } from '@/hooks/useToast'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'
// 设置对话框组件
const SettingsDialog = () => {
  const {
    settings,
    updateSettings,
    addRoomEnterMessage,
    removeRoomEnterMessage,
    updateRoomEnterMessage,
  } = useAutoReplyPlus()
  const [newMessage, setNewMessage] = useState('')
  const { toast } = useToast()

  const handleAddMessage = () => {
    if (!newMessage.trim()) {
      toast.error('消息内容不能为空')
      return
    }

    addRoomEnterMessage(newMessage.trim())
    setNewMessage('')
    toast.success('添加成功')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="设置">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>自动回复设置</DialogTitle>
          <DialogDescription>配置自动回复的行为和消息内容</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-username">隐藏用户名</Label>
            <Switch
              id="hide-username"
              checked={settings.hideUserName}
              onCheckedChange={checked =>
                updateSettings({ hideUserName: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-reply-enter">自动回复进入消息</Label>
            <Switch
              id="auto-reply-enter"
              checked={settings.autoReplyRoomEnter}
              onCheckedChange={checked =>
                updateSettings({ autoReplyRoomEnter: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>进入直播间回复消息</Label>
            <p className="text-sm text-muted-foreground">
              系统将从以下消息中随机选择一条发送
            </p>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {settings.roomEnterMessages.map((message, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={message}
                    onChange={e =>
                      updateRoomEnterMessage(index, e.target.value)
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeRoomEnterMessage(index)}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="输入新的欢迎消息"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <Button onClick={handleAddMessage}>添加</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsDialog
