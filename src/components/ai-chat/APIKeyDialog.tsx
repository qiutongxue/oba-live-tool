import type { AIProvider } from '@/hooks/useAIChat'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAIChatStore } from '@/hooks/useAIChat'
import { GearIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { providers } from 'shared/providers'

export function APIKeyDialog() {
  const { apiKeys, config, setConfig, setApiKey } = useAIChatStore()
  const [open, setOpen] = useState(false)
  const [tempKeys, setTempKeys] = useState(apiKeys)
  const [tempConfig, setTempConfig] = useState(config)

  const handleSave = () => {
    setConfig(tempConfig)
    setApiKey('deepseek', tempKeys.deepseek)
    setApiKey('openrouter', tempKeys.openrouter)
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
            选择并配置您想要使用的 AI 服务商。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择服务商</Label>
              <Select
                value={tempConfig.provider}
                onValueChange={(value) => {
                  const provider = value as AIProvider
                  setTempConfig(prev => ({
                    ...prev,
                    provider,
                    model: prev.modelPreferences[provider],
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择服务商" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(providers) as Array<keyof typeof providers>).map(key => (
                    <SelectItem key={key} value={key}>
                      {providers[key].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>选择模型</Label>
              <Select
                value={tempConfig.model}
                onValueChange={model => setTempConfig(prev => ({
                  ...prev,
                  model,
                  modelPreferences: {
                    ...prev.modelPreferences,
                    [prev.provider]: model,
                  },
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {providers[tempConfig.provider].models.map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={tempKeys[tempConfig.provider]}
                onChange={e => setTempKeys(prev => ({
                  ...prev,
                  [tempConfig.provider]: e.target.value,
                }))}
                placeholder={`请输入您的 ${providers[tempConfig.provider].name} API Key`}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                您可以在
                <a
                  href={providers[tempConfig.provider].apiUrl}
                  target="_blank"
                  className="px-1 text-primary hover:underline"
                >
                  {providers[tempConfig.provider].name}
                </a>
                获取 API Key。您的密钥将被安全地存储在本地。
              </p>
            </div>
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
