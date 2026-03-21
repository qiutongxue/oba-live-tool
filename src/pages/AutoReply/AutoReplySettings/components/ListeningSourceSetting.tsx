import { useMemo } from 'react'
import { abilities, listeningSources } from '@/abilities'
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
const platformListeningSources: Partial<Record<LiveControlPlatform, ListeningSource[]>> =
  Object.fromEntries(
    Object.entries(abilities)
      .filter(([_, s]) => s.autoReply?.source?.length)
      .map(([p, s]) => [p, s.autoReply?.source]),
  )
const listeningSourceNameMap = Object.fromEntries(
  Object.entries(listeningSources).map(([k, v]) => [k, v.name]),
) as Record<ListeningSource, string>

export function ListeningSourceSetting() {
  const { updateGeneralSettings, config } = useAutoReplyConfig()
  const { toast } = useToast()
  const platform = useCurrentLiveControl(context => context.platform)
  const { entry: listeningSource } = config

  const listeningSourceTips = useMemo(() => {
    return listeningSources[listeningSource].tips
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
