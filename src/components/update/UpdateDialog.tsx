import { useMemoizedFn } from 'ahooks'
import { Download, RefreshCw, Rocket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { HtmlRenderer } from '@/components/common/HtmlRenderer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIpcListener } from '@/hooks/useIpc'
import { useUpdateConfigStore, useUpdateStore } from '@/hooks/useUpdate'

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

export function UpdateDialog() {
  const status = useUpdateStore.use.status()
  const setStatus = useUpdateStore.use.setStatus()
  const progress = useUpdateStore.use.progress()
  const setProgress = useUpdateStore.use.setProgress()
  const updateInfo = useUpdateStore.use.versionInfo()
  const startDownload = useUpdateStore.use.startDownload()
  const reset = useUpdateStore.use.reset()
  const error = useUpdateStore.use.error()
  const handleError = useUpdateStore.use.handleError()
  const [dialogOpen, setDialogOpen] = useState(false)
  const updateSource = useUpdateConfigStore(s => s.source)
  const setUpdateSource = useUpdateConfigStore(s => s.setSource)
  const customUpdateSource = useUpdateConfigStore(s => s.customSource)
  const setCustomUpdateSource = useUpdateConfigStore(s => s.setCustomSource)

  useEffect(() => {
    if (status !== 'idle' && status !== 'checking') {
      setDialogOpen(true)
    }
  }, [status])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // 先播放关闭动画
      setDialogOpen(false)
      // 等动画关闭后再 reset
      setTimeout(() => reset(), 300)
    }
  }

  const quitAndInstall = async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.updater.quitAndInstall)
  }

  const handleStartDownload = useMemoizedFn(() => {
    const actualUpdateSource = updateSource === 'custom' ? customUpdateSource : updateSource
    startDownload(actualUpdateSource)
  })

  useIpcListener(IPC_CHANNELS.updater.downloadProgress, info => {
    setStatus('downloading')
    setProgress(info.percent)
  })

  useIpcListener(IPC_CHANNELS.updater.updateDownloaded, () => {
    setStatus('ready')
    setProgress(100)
  })

  useIpcListener(IPC_CHANNELS.updater.updateError, handleError)

  const openDownloadURL = (downloadUrl: string) => {
    window.open(downloadUrl, '_blank')
  }

  const buttonModal = useMemoizedFn(() => {
    if (status === 'downloading' || status === 'preparing') {
      return (
        <Button disabled variant="default">
          <RefreshCw className="mr-2 h-4 w-4 animate-bounce" />
          正在更新...
        </Button>
      )
    }
    if (status === 'ready') {
      return (
        <Button onClick={quitAndInstall} variant="default">
          <Rocket className="mr-2 h-4 w-4" />
          马上安装
        </Button>
      )
    }
    if (status === 'error' && error?.downloadURL) {
      const url = error.downloadURL // 添加一步修复类型推断
      return (
        <Button onClick={() => openDownloadURL(url)} variant="default">
          <Download className="mr-2 h-4 w-4" />
          立即更新
        </Button>
      )
    }
    return (
      <Button onClick={handleStartDownload} variant="default">
        <Download className="mr-2 h-4 w-4" />
        立即更新
      </Button>
    )
  })

  const isCustom = updateSource === 'custom'

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>有新版本可用</DialogTitle>
        <DialogDescription>现在更新以体验最新功能。</DialogDescription>

        {status !== 'error' && (
          <>
            <div className="flex justify-end space-x-1 items-center text-sm text-muted-foreground">
              <span className="text-gray-400">v{updateInfo?.currentVersion}</span>
              <span>{'→'}</span>
              <span className="text-gray-700 font-bold">v{updateInfo?.latestVersion}</span>
            </div>
            {updateInfo?.releaseNote && (
              <ScrollArea className="max-h-64">
                <HtmlRenderer className="markdown-body" html={updateInfo?.releaseNote} />{' '}
              </ScrollArea>
            )}
          </>
        )}
        {/* 出错信息 */}
        {status === 'error' && error?.message && (
          <ScrollArea className="text-sm text-destructive whitespace-pre-line max-h-64">
            <h3 className="text-lg font-bold">错误</h3>
            {error.message}
          </ScrollArea>
        )}
        {/* 进度条 */}
        {(status === 'downloading' || status === 'ready' || status === 'preparing') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {status === 'preparing' ? '准备中' : '下载进度'}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
        <div className={`flex mt-4 ${isCustom ? 'flex-col gap-4' : 'justify-between gap-2'}`}>
          <div className={`${isCustom ? 'w-full flex space-x-4' : ''}`}>
            <Select value={updateSource} onValueChange={value => setUpdateSource(value)}>
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
            {isCustom && (
              <div className="flex flex-col">
                <Input
                  value={customUpdateSource}
                  onChange={e => setCustomUpdateSource(e.target.value)}
                  placeholder="请输入自定义更新源地址"
                  className="max-w-[400px]"
                />
                <p className="text-xs text-muted-foreground">
                  请输入完整的URL地址，如：https://gh-proxy.com/
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              关闭
            </Button>
            {buttonModal()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
