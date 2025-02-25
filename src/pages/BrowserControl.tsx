import { Title } from '@/components/common/Title'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCurrentChromeConfig,
  useCurrentChromeConfigActions,
} from '@/hooks/useChromeConfig'
import { useDevMode } from '@/hooks/useDevMode'
import {
  useCurrentLiveControl,
  useCurrentLiveControlActions,
} from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { CheckIcon, Cross2Icon, GlobeIcon } from '@radix-ui/react-icons'
import { useMemoizedFn } from 'ahooks'
import React, { useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

const platforms = {
  douyin: '抖音小店',
  buyin: '巨量百应',
} as const

export default function BrowserControl() {
  const chromePath = useCurrentChromeConfig(context => context.path)
  const { setPath } = useCurrentChromeConfigActions()

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(
      IPC_CHANNELS.chrome.setPath,
      path => {
        if (path && !chromePath) {
          setPath(path)
        }
      },
    )
    return () => removeListener()
  }, [setPath, chromePath])

  return (
    <div className="container py-8 space-y-4">
      <div>
        <Title title="直播控制台" description="连接并管理您的直播控制台" />
      </div>

      <div className="space-y-8">
        <StatusCard />
        <InstructionsCard />
      </div>
    </div>
  )
}

const StatusCard = React.memo(() => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>控制台状态</CardTitle>
        <CardDescription>查看并管理直播控制台的连接状态</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <ConnectState />
          <div className="flex items-center gap-2">
            <PlatformSelect />
            <ConnectToLiveControl />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

const ConnectToLiveControl = React.memo(() => {
  const { setIsConnected, setAccountName } = useCurrentLiveControlActions()
  const platform = useCurrentLiveControl(context => context.platform)
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const chromePath = useCurrentChromeConfig(context => context.path)
  const oldCookies = useCurrentChromeConfig(
    context => context.cookies[platform],
  )
  const { setCookies } = useCurrentChromeConfigActions()
  const { enabled: devMode } = useDevMode()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const connectLiveControl = useMemoizedFn(async () => {
    try {
      setIsConnected('connecting')
      setIsLoading(true)
      const result = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.liveControl.connect,
        { headless: !devMode, chromePath, cookies: oldCookies, platform },
      )

      if (result?.cookies) {
        setIsConnected('connected')
        setAccountName(result.accountName || '')
        setCookies(platform, result.cookies)
        toast.success('已连接到直播控制台')
      } else {
        throw new Error('找不到 cookies')
      }
    } catch (error) {
      setIsConnected('disconnected')
      toast.error(error instanceof Error ? error.message : '连接直播控制台失败')
    } finally {
      setIsLoading(false)
    }
  })

  const disconnectLiveControl = useMemoizedFn(async () => {
    try {
      setIsLoading(true)
      await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.liveControl.disconnect)
      setAccountName('')
      toast.success('已断开连接')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '断开连接失败')
    } finally {
      setIsConnected('disconnected')
      setIsLoading(false)
    }
  })

  const handleButtonClick = useMemoizedFn(() => {
    if (isConnected === 'connected') {
      disconnectLiveControl()
    } else {
      connectLiveControl()
    }
  })

  return isConnected === 'connected' ? (
    <DisconnectButton handleButtonClick={handleButtonClick} />
  ) : (
    <ConnectButton
      isLoading={isLoading}
      handleButtonClick={handleButtonClick}
    />
  )
})

const ConnectButton = React.memo(
  ({
    isLoading,
    handleButtonClick,
  }: { isLoading: boolean; handleButtonClick: () => void }) => {
    return (
      <Button
        variant={'default'}
        onClick={handleButtonClick}
        disabled={isLoading}
        size="sm"
      >
        <GlobeIcon className="mr-2 h-4 w-4" />
        {isLoading ? '连接中...' : '连接直播控制台'}
      </Button>
    )
  },
)

const DisconnectButton = React.memo(
  ({ handleButtonClick }: { handleButtonClick: () => void }) => {
    const [isHovered, setIsHovered] = useState(false)
    return (
      <Button
        variant="secondary"
        onClick={handleButtonClick}
        size="sm"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered ? (
          <>
            <Cross2Icon className="mr-2 h-4 w-4" />
            断开连接
          </>
        ) : (
          <>
            <CheckIcon className="mr-2 h-4 w-4" />
            已连接
          </>
        )}
      </Button>
    )
  },
)

const ConnectState = React.memo(() => {
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const accountName = useCurrentLiveControl(context => context.accountName)
  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-2 h-2 rounded-full ${isConnected === 'connected' ? 'bg-green-500' : 'bg-gray-300'}`}
      />
      <span className="text-sm text-muted-foreground">
        {isConnected === 'connected'
          ? `已连接${accountName ? ` (${accountName})` : ''}`
          : '未连接'}
      </span>
    </div>
  )
})

const InstructionsCard = React.memo(() => (
  <Card>
    <CardHeader>
      <CardTitle>使用说明</CardTitle>
      <CardDescription>了解如何使用直播控制台</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">1</span>
          </div>
          <p className="text-sm text-muted-foreground leading-6">
            选择平台并点击"连接直播控制台"按钮，等待登录
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">2</span>
          </div>
          <p className="text-sm text-muted-foreground leading-6">
            登录成功后，即可使用自动发言和自动弹窗功能
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
))

const PlatformSelect = React.memo(() => {
  const platform = useCurrentLiveControl(context => context.platform)
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const { setPlatform } = useCurrentLiveControlActions()
  return (
    <Select
      value={platform}
      onValueChange={setPlatform}
      disabled={isConnected !== 'disconnected'}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="选择平台" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(platforms).map(([key, name]) => (
          <SelectItem key={key} value={key}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})
