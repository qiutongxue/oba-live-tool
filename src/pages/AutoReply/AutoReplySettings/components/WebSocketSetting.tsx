import { useId } from 'react'
import ValidatedNumberInput from '@/components/common/ValidateNumberInput'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'

export function WebSocketSetting() {
  const { config, updateWSConfig } = useAutoReplyConfig()
  const websocketId = useId()
  return (
    <div className="flex flex-col space-y-1">
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id={websocketId}
            checked={!!config.ws?.enable}
            onCheckedChange={checked => updateWSConfig({ enable: checked })}
          />
          <Label htmlFor={websocketId}>启用 WebSocket 服务</Label>
        </div>
        <div className="flex space-x-1 items-center">
          <Label>端口号：</Label>
          <ValidatedNumberInput
            disabled={!config.ws?.enable}
            className="w-24"
            type="number"
            placeholder="12354"
            min={2000}
            max={65535}
            value={config.ws?.port ?? 12354}
            onCommit={value => updateWSConfig({ port: value })}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        启用时，点击「开始监听」按钮后将同步启动本地 WebSocket
        服务端，当有新的评论信息时会同步向客户端发送 JSON 格式的信息。
        <br />
        可以通过 WebSocket 客户端连接
        <span className="border p-0.5 px-1 rounded-md mx-1">ws://localhost:{config.ws?.port}</span>
      </p>
    </div>
  )
}
