import type { ProgressInfo } from 'electron-updater'
import { Download, RefreshCw, Rocket } from 'lucide-react'
import { useCallback, useState, useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useIpcListener } from '@/hooks/useIpc'
import { useToast } from '@/hooks/useToast'
import { version } from '../../../package.json'
import { HtmlRenderer } from '../common/HtmlRenderer'
import { ScrollArea } from '../ui/scroll-area'

function Update({ source = 'github' }: { source: string }) {
  const { toast } = useToast()
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [versionInfo, setVersionInfo] = useState<VersionInfo>()
  const [updateError, setUpdateError] = useState<ErrorType>()
  const [progressInfo, setProgressInfo] = useState<Partial<ProgressInfo>>()
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [downloadURL, setDownloadURL] = useState<string>()
  const [modalBtn, setModalBtn] = useState<{
    cancelText?: string
    okText?: string
    onCancel?: () => void
    onOk?: () => void
  }>({
    onCancel: () => setModalOpen(false),
    onOk: () => {
      setDownloading(true)
      window.ipcRenderer.invoke(IPC_CHANNELS.updater.startDownload)
    },
  })

  const checkUpdate = async () => {
    // 先验证 source 正确性
    if (source !== 'github') {
      try {
        const url = new URL(source)
        url.pathname = '/'
        source = url.toString()
      } catch {
        toast.error('更新源格式错误，请检查')
        return
      }
    }
    setChecking(true)
    // 这里的 result 不是 VersionInfo 的 result
    const result = await window.ipcRenderer.invoke(
      IPC_CHANNELS.updater.checkUpdate,
      { source },
    )

    setProgressInfo({ percent: 0 })
    setChecking(false)
    setModalOpen(true)
    if (result && 'error' in result) {
      setUpdateAvailable(false)
      setUpdateError(result)
      if ('downloadURL' in result && result.downloadURL) {
        setDownloadURL(result.downloadURL)
      }
    } else {
      // 原： 检查更新 -> 有可用更新触发事件（不处理结果） -> 处理事件展示内容
      // 由于要检查 CHANGELOG，updateAvailable 事件会有一定的延迟，所以用已返回的结果顶一下
      // 先： 检查更新 -> 有可用更新先处理结果展示到页面 -> 处理到 CHANGELOG 触发可用更新事件 -> 更新内容展示
      const newVersion = result?.updateInfo.version
      setVersionInfo({
        // 简单比较一下
        update: version === newVersion,
        version,
        newVersion,
      })
    }
  }

  const onUpdateCanAvailable = useCallback((arg1: VersionInfo) => {
    setVersionInfo(arg1)
    setUpdateError(undefined)
    // Can be update
    if (arg1.update) {
      setModalBtn(state => ({
        ...state,
        cancelText: '稍后再说',
        okText: '立即更新',
        onOk: () => {
          setDownloading(true)
          // 检查是否有直接下载链接（macOS DMG）
          const downloadURL = (arg1 as any)?.downloadURL
          window.ipcRenderer.invoke(IPC_CHANNELS.updater.startDownload, downloadURL)
        },
      }))
      setUpdateAvailable(true)
    } else {
      setUpdateAvailable(false)
    }
  }, [])

  const onUpdateError = useCallback((arg1: ErrorType) => {
    setUpdateAvailable(false)
    setUpdateError(arg1)
    setDownloading(false)
  }, [])

  const onDownloadProgress = useCallback((arg1: ProgressInfo) => {
    setProgressInfo(arg1)
  }, [])

  const onUpdateDownloaded = useCallback(() => {
    setProgressInfo({ percent: 100 })
    setDownloading(false)
    setModalBtn(state => ({
      ...state,
      cancelText: '稍后安装',
      okText: '马上安装',
      onOk: () =>
        window.ipcRenderer.invoke(IPC_CHANNELS.updater.quitAndInstall),
    }))
  }, [])

  const openDownloadURL = useCallback(() => {
    setModalOpen(false)
    window.open(downloadURL, '_blank')
  }, [downloadURL])

  useEffect(() => {
    // 如果是 macOS 平台，检查是否有直接下载链接
    if ((versionInfo as any)?.downloadURL) {
      setDownloadURL((versionInfo as any).downloadURL)
    }
  }, [versionInfo])

  const getUpdateButtonContent = () => {
    if (downloading) {
      return (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-bounce" />
          正在更新...
        </>
      )
    }
    if (progressInfo?.percent === 100) {
      return (
        <>
          <Rocket className="mr-2 h-4 w-4" />
          马上安装
        </>
      )
    }
    return (
      <>
        <Download className="mr-2 h-4 w-4" />
        立即更新
      </>
    )
  }

  useIpcListener(IPC_CHANNELS.updater.updateAvailable, onUpdateCanAvailable)
  useIpcListener(IPC_CHANNELS.updater.updateError, onUpdateError)
  useIpcListener(IPC_CHANNELS.updater.downloadProgress, onDownloadProgress)
  useIpcListener(IPC_CHANNELS.updater.updateDownloaded, onUpdateDownloaded)

  return (
    <>
      <Dialog
        open={modalOpen}
        onOpenChange={open => !open && modalBtn?.onCancel?.()}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>软件更新</DialogTitle>
            <DialogDescription>
              {updateError
                ? '检查更新时发生错误'
                : updateAvailable
                  ? '发现新版本'
                  : '检查更新状态'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {updateError ? (
              <div className="text-sm text-destructive">
                <p>
                  错误信息：
                  {updateError.message}
                </p>
              </div>
            ) : updateAvailable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">当前版本</span>
                  <span className="font-medium">v{versionInfo?.version}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">最新版本</span>
                  <span className="font-medium">
                    v{versionInfo?.newVersion}
                  </span>
                </div>
                {versionInfo?.releaseNote && (
                  <ScrollArea className="h-64">
                    <HtmlRenderer
                      html={versionInfo.releaseNote}
                      className="markdown-body"
                    />
                  </ScrollArea>
                )}
                {progressInfo?.percent !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">下载进度</span>
                      <span>{Math.round(progressInfo.percent)}%</span>
                    </div>
                    <Progress value={progressInfo.percent} />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                {versionInfo?.version === versionInfo?.newVersion
                  ? '您的应用程序已是最新版本！'
                  : '无可用更新'}
                <div className="mt-2 text-xs">
                  当前版本: v{versionInfo?.version} | 最新版本: v
                  {versionInfo?.newVersion}
                </div>
              </div>
            )}
          </div>

          {updateAvailable && (
            <DialogFooter>
              <Button variant="outline" onClick={modalBtn?.onCancel}>
                {modalBtn?.cancelText || '稍后再说'}
              </Button>
              <Button onClick={modalBtn?.onOk} disabled={downloading}>
                {getUpdateButtonContent()}
              </Button>
            </DialogFooter>
          )}

          {updateError && downloadURL && (
            <DialogFooter>
              <Button onClick={openDownloadURL}>手动下载</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        disabled={checking}
        onClick={checkUpdate}
        size="sm"
      >
        {checking ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            检查更新中
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            检查更新
          </>
        )}
      </Button>
    </>
  )
}
export default Update
