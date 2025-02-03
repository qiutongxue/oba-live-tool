import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAIChatStore } from '@/hooks/useAIChat'
import { GearIcon } from '@radix-ui/react-icons'
import { useState } from 'react'

export function APIKeyDialog() {
  const { apiKey, setApiKey } = useAIChatStore()
  const [open, setOpen] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)

  const handleSave = () => {
    setApiKey(tempKey)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GearIcon className="mr-2 h-4 w-4" />
          配置 API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Key 配置</DialogTitle>
          <DialogDescription className="py-1">
            设置您的
            <a href="https://platform.deepseek.com/api_keys" target="_blank" className="px-1 text-primary hover:underline">DeepSeek API Key</a>
            ，用于访问 AI 服务。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={tempKey}
              onChange={e => setTempKey(e.target.value)}
              placeholder="请输入您的 DeepSeek API Key"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              您的 API Key 将被安全地存储在本地，不会上传到任何服务器。
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
