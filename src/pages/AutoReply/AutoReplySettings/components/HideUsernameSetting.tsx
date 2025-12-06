import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'

export function HideUsernameSetting() {
  const { config, updateGeneralSettings } = useAutoReplyConfig()
  const hideUserNameId = useId()

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Switch
          id={hideUserNameId}
          checked={config.hideUsername}
          onCheckedChange={checked => updateGeneralSettings({ hideUsername: checked })}
        />
        <Label htmlFor={hideUserNameId}>隐藏用户名</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        系统会自动将
        <span className="font-bold mx-1 bg-muted px-1 rounded-md">{'{用户名}'}</span>
        替换为实际的用户名称，如果设置隐藏用户名，只会保留用户名的第一个字符。
        <br />
        未设置隐藏用户名时：{' '}
        <span className="font-bold mx-1 bg-muted px-1 rounded-md">{'{用户名}'}</span> {'->'}{' '}
        <span className="font-bold mx-1 bg-muted px-1 rounded-md">张三</span>
        <br />
        设置隐藏用户名时：{' '}
        <span className="font-bold mx-1 bg-muted px-1 rounded-md">{'{用户名}'}</span> {'->'}{' '}
        <span className="font-bold mx-1 bg-muted px-1 rounded-md">张***</span>
      </p>
    </div>
  )
}
