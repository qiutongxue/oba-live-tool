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
import type { AIProvider, ProviderConfig } from '@/hooks/useAIChat'
import { useAIChatStore } from '@/hooks/useAIChat'
import { GearIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { providers } from 'shared/providers'
import { ScrollArea } from '../ui/scroll-area'

function ModelSelector({
  tempConfig,
  setTempConfig,
}: {
  tempConfig: ProviderConfig
  setTempConfig: React.Dispatch<React.SetStateAction<ProviderConfig>>
}) {
  if (tempConfig.provider === 'volcengine') {
    return (
      <div className="space-y-2">
        <Label>接入点名称</Label>
        <Input
          value={tempConfig.model}
          onChange={e =>
            setTempConfig(prev => ({
              ...prev,
              model: e.target.value,
              modelPreferences: {
                ...prev.modelPreferences,
                [prev.provider]: e.target.value,
              },
            }))
          }
          placeholder="请输入火山引擎的接入点名称"
        />
        <p className="text-xs text-muted-foreground">
          您可以在
          <a
            href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint"
            rel="noreferrer"
            target="_blank"
            className="px-1 text-primary hover:underline"
          >
            火山引擎控制台
          </a>
          获取接入点名称。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>选择模型</Label>
      <Select
        value={tempConfig.model}
        onValueChange={model =>
          setTempConfig(prev => ({
            ...prev,
            model,
            modelPreferences: {
              ...prev.modelPreferences,
              [prev.provider]: model,
            },
          }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          <ScrollArea className="h-[200px]">
            {providers[tempConfig.provider].models.map(model => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  )
}

export function APIKeyDialog() {
  const { apiKeys, config, setConfig, setApiKey } = useAIChatStore()
  const [open, setOpen] = useState(false)
  const [tempKeys, setTempKeys] = useState(apiKeys)
  const [tempConfig, setTempConfig] = useState(config)

  const handleSave = () => {
    setConfig(tempConfig)
    for (const key of Object.keys(providers)) {
      setApiKey(key as AIProvider, tempKeys[key as AIProvider])
    }
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
            选择并配置您想要使用的 AI 提供商。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择提供商</Label>
              <Select
                value={tempConfig.provider}
                onValueChange={value => {
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
                  {(
                    Object.keys(providers) as Array<keyof typeof providers>
                  ).map(key => (
                    <SelectItem key={key} value={key}>
                      {providers[key].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ModelSelector
              tempConfig={tempConfig}
              setTempConfig={setTempConfig}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={tempKeys[tempConfig.provider]}
                onChange={e =>
                  setTempKeys(prev => ({
                    ...prev,
                    [tempConfig.provider]: e.target.value,
                  }))
                }
                placeholder={`请输入您的 ${providers[tempConfig.provider].name} API Key`}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                您可以在
                <a
                  href={providers[tempConfig.provider].apiUrl}
                  rel="noreferrer"
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
