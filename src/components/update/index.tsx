import type { ProgressInfo } from 'electron-updater'
import Modal from '@/components/update/Modal'
import Progress from '@/components/update/Progress'
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
      <Modal
        open={modalOpen}
        cancelText={modalBtn?.cancelText}
        okText={modalBtn?.okText}
        onCancel={modalBtn?.onCancel}
        onOk={modalBtn?.onOk}
        footer={updateAvailable ? /* hide footer */null : undefined}
        title={<div className="text-white px-4">软件更新</div>}
      >
        <div className="modal-slot">
          {updateError
            ? (
                <div>
                  <p>Error downloading the latest version.</p>
                  <p>{updateError.message}</p>
                </div>
              )
            : updateAvailable
              ? (
                  <div>
                    <div>
                      The last version is: v
                      {versionInfo?.newVersion}
                    </div>
                    <div className="new-version__target">
                      v
                      {versionInfo?.version}
                      {' '}
                      -&gt; v
                      {versionInfo?.newVersion}
                    </div>
                    <div className="update__progress">
                      <div className="progress__title">Update progress:</div>
                      <div className="progress__bar">
                        <Progress percent={progressInfo?.percent}></Progress>
                      </div>
                    </div>
                  </div>
                )
              : (
                  <div className="can-not-available">
                    {
                      versionInfo?.version === versionInfo?.newVersion
                        ? '已经是最新版本了！'
                        : JSON.stringify(versionInfo ?? {}, null, 2)
                    }
                  </div>
                )}
        </div>
      </Modal>
      <button
        type="button"
        disabled={checking}
        onClick={checkUpdate}
        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
          checking
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {checking ? '检查更新中...' : '检查更新'}
      </button>
    </>
  )
}

export default Update
