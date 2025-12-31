import { EraserIcon, FolderSearchIcon, SearchIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { SimpleIconsGooglechrome, SimpleIconsMicrosoftedge } from '@/components/icons/simpleIcons'
import { useCurrentChromeConfig, useCurrentChromeConfigActions } from '@/hooks/useChromeConfig'
import { useToast } from '@/hooks/useToast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Separator } from '../../../components/ui/separator'
import { Switch } from '../../../components/ui/switch'

export function BrowserSetting() {
  const path = useCurrentChromeConfig(context => context.path)
  const { setPath, setStorageState } = useCurrentChromeConfigActions()
  const [isDetecting, setIsDetecting] = useState(false)
  const [edgeFirst, setEdgeFirst] = useState(false)
  const { toast } = useToast()

  const handleCookiesReset = () => {
    setStorageState('')
    toast.success('登录状态已重置')
  }

  const handleSelectChrome = async () => {
    try {
      const path = await window.ipcRenderer.invoke(IPC_CHANNELS.chrome.selectPath)
      if (path) {
        setPath(path)

        toast.success('Chrome 路径设置成功')
      }
    } catch {
      toast.error('选择 Chrome 路径失败')
    }
  }

  const handleAutoDetect = async () => {
    try {
      setIsDetecting(true)
      const result = await window.ipcRenderer.invoke(IPC_CHANNELS.chrome.getPath, edgeFirst)
      if (result) {
        setPath(result)

        toast.success('已自动检测到路径')
      } else {
        toast.error('未检测到 Chrome，请确保 Chrome 已打开')
      }
    } catch {
      toast.error('检测 Chrome 路径失败')
    } finally {
      setIsDetecting(false)
    }
  }

  const edgeFirstId = useId()

  return (
    <Card>
      <CardHeader>
        <CardTitle>浏览器设置</CardTitle>
        <CardDescription>配置浏览器路径</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 自动检测 */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium leading-none">自动检测浏览器</h4>
                <p className="text-sm text-muted-foreground">
                  打开浏览器后点击检测，自动获取安装路径
                </p>
              </div>
              <Button
                variant="default"
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="shrink-0"
              >
                <SearchIcon className={`mr-2 h-4 w-4 ${isDetecting ? 'animate-spin' : ''}`} />
                {isDetecting ? '检测中...' : '开始检测'}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id={edgeFirstId} checked={edgeFirst} onCheckedChange={setEdgeFirst} />
              <Label htmlFor={edgeFirstId} className="text-sm text-muted-foreground">
                优先使用 Edge 浏览器
              </Label>
            </div>
          </div>
        </div>

        {/* 手动配置 */}
        <div className="space-y-1">
          <Label>浏览器路径</Label>
          <div className="flex gap-2">
            <Input
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="请选择或输入浏览器路径"
              className="font-mono"
            />
            <Button variant="outline" onClick={handleSelectChrome}>
              <FolderSearchIcon className="mr-2 h-4 w-4" />
              浏览
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            请选择
            <span className="ml-1">
              <SimpleIconsGooglechrome className="w-4 h-4 inline mx-1" />
              chrome.exe
            </span>
            <span className="before:content-['|'] before:mx-1">
              <SimpleIconsMicrosoftedge className="w-4 h-4 inline mx-1" />
              msedge.exe
            </span>
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">重置登录状态</h4>
            <p className="text-sm text-muted-foreground">
              清除已保存的登录信息，下次启动时需要重新登录
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <EraserIcon className="mr-2 h-4 w-4" />
                重置
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认重置登录状态？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将清除已保存的登录信息，您需要在下次启动时重新登录。此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCookiesReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  确认重置
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
