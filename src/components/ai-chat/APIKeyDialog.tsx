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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAIChatStore } from '@/hooks/useAIChat'
import { GearIcon } from '@radix-ui/react-icons'
import { useState } from 'react'

const providers = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://platform.deepseek.com/api_keys',
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/keys',
  },
} as const

export function APIKeyDialog() {
  const { apiKeys, provider, setApiKey, setProvider } = useAIChatStore()
  const [open, setOpen] = useState(false)
  const [tempKeys, setTempKeys] = useState(apiKeys)
  const [tempProvider, setTempProvider] = useState(provider)

  const handleSave = () => {
    setProvider(tempProvider)
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
            <Label>选择服务商</Label>
            <RadioGroup
              value={tempProvider}
              onValueChange={value => setTempProvider(value as typeof provider)}
              className="grid grid-cols-2 gap-4"
            >
              {(Object.keys(providers) as Array<keyof typeof providers>).map(key => (
                <div key={key}>
                  <RadioGroupItem
                    value={key}
                    id={key}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={key}
                    className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground transition-colors peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                  >
                    <span className="text-sm font-medium">{providers[key].name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={tempKeys[tempProvider]}
                onChange={e => setTempKeys(prev => ({
                  ...prev,
                  [tempProvider]: e.target.value,
                }))}
                placeholder={`请输入您的 ${providers[tempProvider].name} API Key`}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                您可以在
                <a
                  href={providers[tempProvider].url}
                  target="_blank"
                  className="px-1 text-primary hover:underline"
                >
                  {providers[tempProvider].name}
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
