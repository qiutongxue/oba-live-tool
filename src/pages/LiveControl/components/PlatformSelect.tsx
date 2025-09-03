import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCurrentLiveControl,
  useCurrentLiveControlActions,
} from '@/hooks/useLiveControl'

const basePlatforms: Record<LiveControlPlatform, string> = {
  douyin: '抖音小店',
  buyin: '巨量百应',
  eos: '抖音团购',
  redbook: '小红书',
  wxchannel: '视频号',
  kuaishou: '快手小店',
  taobao: '淘宝',
  dev: '测试平台',
}

const platforms = (() => {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return basePlatforms
  }
  const { dev: _, ...productionPlatforms } = basePlatforms
  return productionPlatforms
})()

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

export default PlatformSelect
