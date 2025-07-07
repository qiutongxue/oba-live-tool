import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import Update from '@/components/update'
import { useUpdateStore } from '@/hooks/useUpdate'
import { useOSPlatform } from '@/hooks/useOSPlatform'
import { version } from '../../../../package.json'

interface UpdateSource {
  value: string
  label: string
}

const updateSources: UpdateSource[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'https://gh-proxy.com', label: 'gh-proxy.com' },
  { value: 'https://ghproxy.net', label: 'ghproxy.net' },
  { value: 'custom', label: '自定义' },
]

export function UpdateSetting() {
  const [updateSource, setUpdateSource] = useState<string>('github')
  const [customUpdateSource, setCustomUpdateSource] = useState<string>('')
  const { enableAutoCheckUpdate, setEnableAutoCheckUpdate } = useUpdateStore()
  const platform = useOSPlatform()
  const isMac = platform === 'darwin'

  // 获取实际的更新源
  const getActualUpdateSource = () => {
    return updateSource === 'custom' ? customUpdateSource : updateSource
  }

  return (
    // biome-ignore lint/nursery/useUniqueElementIds: 检查更新跳转的锚点，需要知道 id 的具体名称
    <Card id="update-section">
      <CardHeader>
        <CardTitle>软件更新</CardTitle>
        <CardDescription>检查并安装最新版本的应用程序</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isMac && (
          <Alert>
            <AlertDescription>
              检测到您使用的是 macOS 系统，更新将通过浏览器打开下载链接，请手动下载并安装。
            </AlertDescription>
          </Alert>
        )}
      
        <div className="space-y-4">
          {/* 手动更新 */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>更新源</Label>
              <p className="text-sm text-muted-foreground">
                选择合适的更新源以获取最新版本
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={updateSource}
                onValueChange={value => setUpdateSource(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择更新源" />
                </SelectTrigger>
                <SelectContent>
                  {updateSources.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Update source={getActualUpdateSource()} />
            </div>
          </div>

          {updateSource === 'custom' && (
            <div className="space-y-2">
              <Label>自定义更新源地址</Label>
              <Input
                value={customUpdateSource}
                onChange={e => setCustomUpdateSource(e.target.value)}
                placeholder="请输入自定义更新源地址"
                className="max-w-[400px]"
              />
              <p className="text-sm text-muted-foreground">
                请输入完整的URL地址，如：https://gh-proxy.com/
              </p>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        <div className="flex justify-between items-center ">
          <div className="space-y-1">
            <Label>有新版本时弹窗提示</Label>
            <p className="text-sm text-muted-foreground">
              弹窗显示新版本更新了什么内容
            </p>
          </div>
          <Switch
            checked={enableAutoCheckUpdate}
            onCheckedChange={setEnableAutoCheckUpdate}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">当前版本</h4>
            <p className="text-sm text-muted-foreground">{version}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
