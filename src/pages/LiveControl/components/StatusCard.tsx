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
import React, { useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import PlatformSelect from './PlatformSelect'

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

export default StatusCard
