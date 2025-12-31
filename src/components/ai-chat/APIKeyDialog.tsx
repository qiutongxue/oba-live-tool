import { CheckIcon, Eye, EyeOff, SettingsIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { providers } from 'shared/providers'
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
import { useToast } from '@/hooks/useToast'
import { ScrollArea } from '../ui/scroll-area'

const PresetModelSelector = memo(
  ({
    provider,
    model,
    onChange,
  }: {
    provider: keyof typeof providers
    model: string
    onChange: (model: string) => void
  }) => {
    return (
      <div className="space-y-2">
        <Label>选择模型</Label>
        <Select value={model} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[200px]">
              {providers[provider].models.map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>
    )
  },
)

// 火山引擎的接入点，替换 model 的
const VolcengineEndpoint = memo(
  ({ model, onChange }: { model: string; onChange: (model: string) => void }) => {
    return (
      <div className="space-y-2">
        <Label>模型或接入点 ID</Label>
        <Input
          value={model}
          onChange={e => onChange(e.target.value)}
          placeholder="请输入火山引擎的模型 ID 或接入点 ID"
        />
        <p className="text-xs text-muted-foreground">
          您可以在
          <a
            href="https://www.volcengine.com/docs/82379/1330310"
            rel="noreferrer"
            target="_blank"
            className="px-1 text-primary hover:underline"
          >
            模型列表
          </a>
          获取模型 ID，或在
          <a
            href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint"
            rel="noreferrer"
            target="_blank"
            className="px-1 text-primary hover:underline"
          >
            火山引擎控制台
          </a>
          获取接入点 ID。
        </p>
      </div>
    )
  },
)

const CustomModelInput = memo(
  ({ model, onChange }: { model: string; onChange: (model: string) => void }) => {
    return (
      <div className="space-y-2">
        <Label>模型名称</Label>
        <Input
          value={model}
          onChange={e => onChange(e.target.value)}
          placeholder="model，如 deepseek-reasoner"
          className="font-mono"
        />
      </div>
    )
  },
)

const ModelSelector = memo(
  ({
    tempConfig,
    onModelChange,
  }: {
    tempConfig: ProviderConfig
    onModelChange: (model: string) => void
  }) => {
    const handleModelChange = useCallback(
      (model: string) => {
        onModelChange(model)
      },
      [onModelChange],
    )

    if (tempConfig.provider === 'custom') {
      return (
        <CustomModelInput
          model={tempConfig.modelPreferences.custom || ''}
          onChange={handleModelChange}
        />
      )
    }

    if (tempConfig.provider === 'volcengine') {
      return (
        <VolcengineEndpoint
          model={tempConfig.modelPreferences.volcengine || ''}
          onChange={handleModelChange}
        />
      )
    }

    return (
      <PresetModelSelector
        provider={tempConfig.provider as keyof typeof providers}
        model={tempConfig.modelPreferences[tempConfig.provider] || ''}
        onChange={handleModelChange}
      />
    )
  },
)

const ApiKeyInput = memo(
  ({
    provider,
    apiKey,
    onChange,
    onTest,
    testSuccess,
    testLoading,
  }: {
    provider: AIProvider
    apiKey: string
    onChange: (key: string) => void
    onTest: () => void
    testSuccess: boolean
    testLoading: boolean
  }) => {
    const isCustom = provider === 'custom'
    const providerInfo = providers[provider as keyof typeof providers]
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>API Key</Label>
          {provider !== 'volcengine' && (
            <div className="flex items-center gap-2">
              {testSuccess && <CheckIcon className="h-4 w-4 text-green-500" />}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onTest}
                disabled={!apiKey || testLoading}
              >
                {testLoading ? '测试中...' : '测试连接'}
              </Button>
            </div>
          )}
        </div>
        <div className="relative w-full max-w-sm">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={apiKey}
            onChange={e => onChange(e.target.value)}
            placeholder={`请输入您的 ${providerInfo?.name || '自定义服务'} API Key`}
            className="font-mono pr-10"
          />
          <Button
            type="button"
            variant="link"
            size="icon"
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        {!isCustom && providerInfo && (
          <p className="text-xs text-muted-foreground">
            您可以在
            <a
              href={providerInfo.apiUrl}
              rel="noreferrer"
              target="_blank"
              className="px-1 text-primary hover:underline"
            >
              {providerInfo.name}
            </a>
            获取 API Key。您的密钥将被安全地存储在本地。
          </p>
        )}
        {isCustom && (
          <p className="text-xs text-muted-foreground">您的密钥将被安全地存储在本地。</p>
        )}
      </div>
    )
  },
)

export function APIKeyDialog() {
  const { apiKeys, config, setConfig, setApiKey, customBaseURL, setCustomBaseURL } =
    useAIChatStore()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [tempKeys, setTempKeys] = useState(apiKeys)
  const [tempConfig, setTempConfig] = useState(config)
  const [tempCustomBaseURL, setTempCustomBaseURL] = useState(customBaseURL || '')
  const [testLoading, setTestLoading] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)

  // 保存配置
  const handleSave = useCallback(() => {
    setConfig(tempConfig)

    if (tempConfig.provider === 'custom') {
      setCustomBaseURL(tempCustomBaseURL)
    }

    // 保存所有API Keys
    for (const key of Object.keys(providers)) {
      setApiKey(key as AIProvider, tempKeys[key as AIProvider] || '')
    }

    setOpen(false)
  }, [tempConfig, tempCustomBaseURL, tempKeys, setConfig, setCustomBaseURL, setApiKey])

  const handleProviderChange = useCallback((value: string) => {
    const provider = value as AIProvider
    setTempConfig(prev => ({
      ...prev,
      provider,
      model: prev.modelPreferences[provider] || '',
    }))
  }, [])

  const handleModelChange = useCallback((model: string) => {
    setTempConfig(prev => ({
      ...prev,
      model,
      modelPreferences: {
        ...prev.modelPreferences,
        [prev.provider]: model,
      },
    }))
  }, [])

  const handleApiKeyChange = useCallback(
    (key: string) => {
      setTempKeys(prev => ({
        ...prev,
        [tempConfig.provider]: key,
      }))
    },
    [tempConfig.provider],
  )

  const handleTestApiKey = useCallback(async () => {
    if (!tempKeys[tempConfig.provider]) {
      toast.error('请先输入API Key')
      return
    }

    setTestLoading(true)
    setTestSuccess(false)
    try {
      const result = await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.aiChat.testApiKey, {
        apiKey: tempKeys[tempConfig.provider],
        provider: tempConfig.provider,
        customBaseURL: tempConfig.provider === 'custom' ? tempCustomBaseURL : undefined,
      })

      if (result.success) {
        setTestSuccess(true)
      } else {
        toast.error(result.error ?? '测试连接失败')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '未知错误')
    } finally {
      setTestLoading(false)
    }
  }, [tempConfig.provider, tempKeys, tempCustomBaseURL, toast])

  // 当切换提供商时重置测试状态
  // biome-ignore lint/correctness/useExhaustiveDependencies: 需要依赖 provider 的变化（可能有更好的方法）
  useEffect(() => {
    setTestSuccess(false)
  }, [tempConfig.provider])

  const dialogContent = useMemo(
    () => (
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Key 配置</DialogTitle>
          <DialogDescription className="py-1">选择并配置您想要使用的 AI 提供商。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择提供商</Label>
              <Select value={tempConfig.provider} onValueChange={handleProviderChange}>
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

            {tempConfig.provider === 'custom' && (
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={tempCustomBaseURL}
                  onChange={e => setTempCustomBaseURL(e.target.value)}
                  placeholder="baseURL，如 https://api.example.com/v1"
                  className="font-mono"
                />
              </div>
            )}

            <ModelSelector tempConfig={tempConfig} onModelChange={handleModelChange} />

            <ApiKeyInput
              provider={tempConfig.provider}
              apiKey={tempKeys[tempConfig.provider] || ''}
              onChange={handleApiKeyChange}
              onTest={handleTestApiKey}
              testSuccess={testSuccess}
              testLoading={testLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    ),
    [
      tempConfig,
      tempKeys,
      tempCustomBaseURL,
      handleProviderChange,
      handleModelChange,
      handleApiKeyChange,
      handleSave,
      handleTestApiKey,
      testSuccess,
      testLoading,
    ],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon className="mr-2 h-4 w-4" />
          配置 API Key
        </Button>
      </DialogTrigger>
      {open && dialogContent}
    </Dialog>
  )
}
