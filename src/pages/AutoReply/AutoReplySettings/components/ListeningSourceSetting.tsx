import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type AutoReplyConfig, useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'

type ListeningSource = AutoReplyConfig['entry']
const platformListeningSources: Partial<Record<LiveControlPlatform, ListeningSource[]>> = {
  douyin: ['control', 'compass'],
  buyin: ['control', 'compass'],
  wxchannel: ['wechat-channel'],
  xiaohongshu: ['xiaohongshu'],
  pgy: ['xiaohongshu'],
}
const listeningSourceNameMap = {
  control: '中控台',
  compass: '电商罗盘大屏',
  'wechat-channel': '视频号',
  xiaohongshu: '小红书',
}

export function ListeningSourceSetting() {
  const { updateGeneralSettings, config } = useAutoReplyConfig()
  const { toast } = useToast()
  const platform = useCurrentLiveControl(context => context.platform)
  const { entry: listeningSource } = config

  const listeningSourceTips = useMemo(() => {
    switch (listeningSource) {
      case 'control':
        return '中控台监听只能获取评论消息'
      case 'compass':
        return '电商罗盘大屏监听可以获取评论、点赞、进入直播间等全部消息类型'
      case 'wechat-channel':
        return '视频号监听目前暂时只支持用户评论消息'
      case 'xiaohongshu':
        return '小红书监听目前暂时只支持用户评论消息'
      default:
        return ''
    }
  }, [listeningSource])

  const handleSourceChange = (value: ListeningSource) => {
    updateGeneralSettings({ entry: value })
    toast.success(`已切换至${listeningSourceNameMap[value]}监听`)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">监听来源</h3>
      <Select
        value={listeningSource}
        onValueChange={value => handleSourceChange(value as ListeningSource)}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择监听来源" />
        </SelectTrigger>
        <SelectContent>
          {(platformListeningSources[platform] ?? []).map(source => (
            <SelectItem key={source} value={source}>
              {listeningSourceNameMap[source]}监听
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{listeningSourceTips}</p>
    </div>
  )
}
