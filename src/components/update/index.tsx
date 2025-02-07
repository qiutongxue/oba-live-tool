import type { ProgressInfo } from 'electron-updater'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { DownloadIcon, ReloadIcon, RocketIcon } from '@radix-ui/react-icons'
import { useCallback, useEffect, useState } from 'react'
import './update.css'

function Update({ source = 'gh-proxy' }: { source: 'github' | 'gh-proxy' }) {
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [versionInfo, setVersionInfo] = useState<VersionInfo>()
  const [updateError, setUpdateError] = useState<ErrorType>()
  const [progressInfo, setProgressInfo] = useState<Partial<ProgressInfo>>()
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [modalBtn, setModalBtn] = useState<{
    cancelText?: string
    okText?: string
    onCancel?: () => void
    onOk?: () => void
  }>({
        onCancel: () => setModalOpen(false),
        onOk: () => {
          setDownloading(true)
          window.ipcRenderer.invoke('start-download')
        },
      })

  const checkUpdate = async () => {
    setChecking(true)
    const result = await window.ipcRenderer.invoke('check-update', { source })
    setProgressInfo({ percent: 0 })
    setChecking(false)
    setModalOpen(true)
    if (result?.error) {
      setUpdateAvailable(false)
      setUpdateError(result?.error)
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
          window.ipcRenderer.invoke('start-download')
        },
      }))
      setUpdateAvailable(true)
    }
    else {
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
      onOk: () => window.ipcRenderer.invoke('quit-and-install'),
    }))
  }, [])

  const getUpdateButtonContent = () => {
    if (downloading) {
      return (
        <>
          <DownloadIcon className="mr-2 h-4 w-4 animate-bounce" />
          正在更新...
        </>
      )
    }
    if (progressInfo?.percent === 100) {
      return (
        <>
          <RocketIcon className="mr-2 h-4 w-4" />
          马上安装
        </>
      )
    }
    return (
      <>
        <DownloadIcon className="mr-2 h-4 w-4" />
        立即更新
      </>
    )
  }

  useEffect(() => {
    const removeUpdateCanAvailable = window.ipcRenderer.on('update-can-available', onUpdateCanAvailable)
    const removeUpdateError = window.ipcRenderer.on('update-error', onUpdateError)
    const removeDownloadProgress = window.ipcRenderer.on('download-progress', onDownloadProgress)
    const removeUpdateDownloaded = window.ipcRenderer.on('update-downloaded', onUpdateDownloaded)

    return () => {
      removeUpdateCanAvailable()
      removeUpdateError()
      removeDownloadProgress()
      removeUpdateDownloaded()
    }
  }, [onUpdateCanAvailable, onUpdateError, onDownloadProgress, onUpdateDownloaded])

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={open => !open && modalBtn?.onCancel?.()}>
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
            {updateError
              ? (
                  <div className="text-sm text-destructive">
                    <p>
                      错误信息：
                      {updateError.message}
                    </p>
                  </div>
                )
              : updateAvailable
                ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">当前版本</span>
                        <span className="font-medium">
                          v
                          {versionInfo?.version}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">最新版本</span>
                        <span className="font-medium">
                          v
                          {versionInfo?.newVersion}
                        </span>
                      </div>
                      {progressInfo?.percent !== undefined && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">下载进度</span>
                            <span>
                              {Math.round(progressInfo.percent)}
                              %
                            </span>
                          </div>
                          <Progress value={progressInfo.percent} />
                        </div>
                      )}
                    </div>
                  )
                : (
                    <div className="text-center text-sm text-muted-foreground">
                      {versionInfo?.version === versionInfo?.newVersion
                        ? '您的应用程序已是最新版本！'
                        : `无可用更新`}
                      <div className="mt-2 text-xs">
                        当前版本: v
                        {versionInfo?.version}
                        {' '}
                        | 最新版本: v
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
              <Button
                onClick={modalBtn?.onOk}
                disabled={downloading}
              >
                {getUpdateButtonContent()}
              </Button>
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
        {checking
          ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                检查更新中
              </>
            )
          : (
              <>
                <ReloadIcon className="mr-2 h-4 w-4" />
                检查更新
              </>
            )}
      </Button>
    </>
  )
}
export default Update
