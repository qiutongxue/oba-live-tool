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
import React from 'react'

const platforms = {
  douyin: '抖音小店',
  buyin: '巨量百应',
} as const

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
