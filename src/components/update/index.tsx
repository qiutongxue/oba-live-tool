import type { ProgressInfo } from 'electron-updater'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { DownloadIcon, ReloadIcon } from '@radix-ui/react-icons'
import { useCallback, useEffect, useState } from 'react'
import './update.css'

function Update() {
  const [checking, setChecking] = useState(false)
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
        onOk: () => window.ipcRenderer.invoke('start-download'),
      })

  const checkUpdate = async () => {
    setChecking(true)
    /**
     * @type {import('electron-updater').UpdateCheckResult | null | { message: string, error: Error }}
     */
    const result = await window.ipcRenderer.invoke('check-update')
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
        cancelText: 'Cancel',
        okText: 'Update',
        onOk: () => window.ipcRenderer.invoke('start-download'),
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
  }, [])

  const onDownloadProgress = useCallback((arg1: ProgressInfo) => {
    setProgressInfo(arg1)
  }, [])

  const onUpdateDownloaded = useCallback(() => {
    setProgressInfo({ percent: 100 })
    setModalBtn(state => ({
      ...state,
      cancelText: 'Later',
      okText: 'Install now',
      onOk: () => window.ipcRenderer.invoke('quit-and-install'),
    }))
  }, [])

  useEffect(() => {
    // Get version information and whether to update
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
                        : '正在检查更新...'}
                    </div>
                  )}
          </div>

          {updateAvailable && (
            <DialogFooter>
              <Button variant="outline" onClick={modalBtn?.onCancel}>
                {modalBtn?.cancelText || '稍后再说'}
              </Button>
              <Button onClick={modalBtn?.onOk}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                {modalBtn?.okText || '立即更新'}
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
