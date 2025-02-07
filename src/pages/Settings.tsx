import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import Update from '@/components/update'
import { useChromeConfig } from '@/hooks/useChromeConfig'
import { useDevMode } from '@/hooks/useDevMode'
import { useLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { CodeIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { version } from '../../package.json'

export default function Settings() {
  const { path, setPath } = useChromeConfig()
  const { isConnected } = useLiveControl()
  const { toast } = useToast()
  const [isDetecting, setIsDetecting] = useState(false)
  const { enabled: devMode, setEnabled: setDevMode } = useDevMode()

  // 监听主进程发送的 Chrome 路径
  useEffect(() => {
    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.setChromePath, (path: string) => {
      if (path)
        setPath(path)
    })
    return () => removeListener()
  }, [setPath])

  const handleSelectChrome = async () => {
    try {
      const path = await window.ipcRenderer.invoke(IPC_CHANNELS.selectChromePath)
      if (path) {
        setPath(path)

        toast.success('Chrome 路径设置成功')
      }
    }
    catch {
      toast.error('选择 Chrome 路径失败')
    }
  }

  const handleAutoDetect = async () => {
    try {
      setIsDetecting(true)
      const result = await window.ipcRenderer.invoke(IPC_CHANNELS.getChromePath)
      if (result) {
        setPath(result)

        toast.success('已自动检测到 Chrome 路径')
      }
      else {
        toast.error('未检测到 Chrome，请确保 Chrome 已打开')
      }
    }
    catch {
      toast.error('检测 Chrome 路径失败')
    }
    finally {
      setIsDetecting(false)
    }
  }

  const handleToggleDevMode = async (checked: boolean) => {
    try {
      setDevMode(checked)
      toast.success(checked ? '已开启开发者模式' : '已关闭开发者模式')
    }

    catch {
      toast.error('切换开发者模式失败')
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-2">
          管理您的应用程序设置和偏好。
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>浏览器设置</CardTitle>
            <CardDescription>配置 Chrome 浏览器路径</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 自动检测 */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium leading-none">自动检测 Chrome</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>打开 Chrome 浏览器后</strong>
                    点击检测，自动获取安装路径
                  </p>
                </div>
                <Button
                  variant="default"
                  onClick={handleAutoDetect}
                  disabled={isDetecting}
                  className="flex-shrink-0"
                >
                  <MagnifyingGlassIcon className={`mr-2 h-4 w-4 ${isDetecting ? 'animate-spin' : ''}`} />
                  {isDetecting ? '检测中...' : '开始检测'}
                </Button>
              </div>
            </div>

            {/* 手动配置 */}
            <div className="space-y-1">
              <Label>Chrome 路径</Label>
              <div className="flex gap-2">
                <Input
                  value={path}
                  onChange={e => setPath(e.target.value)}
                  placeholder="请选择或输入 Chrome 浏览器路径"
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={handleSelectChrome}
                >
                  <CodeIcon className="mr-2 h-4 w-4" />
                  浏览
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {isConnected
                  ? '已成功连接到 Chrome'
                  : path
                    ? '请确保路径正确，并重新连接直播控制台'
                    : '请选择 Chrome 浏览器的安装路径（chrome.exe）'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统</CardTitle>
            <CardDescription>查看和管理系统相关的设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium leading-none">软件更新</h4>
                  <p className="text-sm text-muted-foreground">
                    检查并安装最新版本的应用程序
                  </p>
                </div>
                <Update />
              </div>
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium leading-none">当前版本</h4>
                  <p className="text-sm text-muted-foreground">
                    {version}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>开发者选项</CardTitle>
            <CardDescription>调试和高级功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-y-1">
              <div>
                <h4 className="text-sm font-medium leading-none mb-2">开发者模式</h4>
                <p className="text-sm text-muted-foreground">
                  开启后可以打开控制台调试，直播控制台将关闭无头模式
                </p>
              </div>
              <Switch
                checked={devMode}
                onCheckedChange={handleToggleDevMode}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
