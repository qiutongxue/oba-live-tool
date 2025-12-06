import { useMemoizedFn } from 'ahooks'
import { X } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'

export function WechatChannelSetting() {
  const { config, updatePinCommentConfig } = useAutoReplyConfig()
  const [newMatchStr, setNewMatchStr] = useState('')
  const { pinComment } = config
  const pinCommentId = useId()
  const addMatchStr = useMemoizedFn(() => {
    if (!newMatchStr) return
    updatePinCommentConfig({
      matchStr: [...pinComment.matchStr, newMatchStr],
    })
    setNewMatchStr('')
  })

  const removeMatchStr = useMemoizedFn((idx: number) => {
    updatePinCommentConfig({
      matchStr: pinComment.matchStr.filter((_, i) => i !== idx),
    })
  })

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor={pinCommentId}>启用视频号上墙</Label>
            <Switch
              id={pinCommentId}
              checked={pinComment.enable}
              onCheckedChange={checked => updatePinCommentConfig({ enable: checked })}
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          开启后，匹配到关键字的<strong>最新</strong>评论将被上墙，上墙间隔暂定为 10 秒
        </div>
      </div>
      {pinComment.enable && (
        <div className="flex flex-col space-y-2">
          <div className="flex flex-wrap gap-2">
            {pinComment.matchStr.map((str, idx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: 下标无妨
                key={idx}
                className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center relative"
              >
                {str}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1"
                  onClick={() => removeMatchStr(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Input
              id="new-matched-str"
              type="text"
              className="text-secondary-foreground px-2 py-1 rounded-md text-sm"
              placeholder="添加关键字"
              value={newMatchStr}
              onChange={e => setNewMatchStr(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  addMatchStr()
                }
              }}
            />
            <Button size="sm" onClick={addMatchStr} disabled={!newMatchStr}>
              添加
            </Button>
          </div>

          <div className="flex items-center justify-start gap-2 mt-2">
            <Label htmlFor="include-host">包含主播的评论</Label>
            <Switch
              id="include-host"
              checked={pinComment.includeHost}
              onCheckedChange={checked => updatePinCommentConfig({ includeHost: checked })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
