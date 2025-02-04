import type {
  AppUpdater,
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'
import { createRequire } from 'node:module'
import { app, ipcMain } from 'electron'
import { createLogger } from './logger'

const { autoUpdater }: { autoUpdater: AppUpdater } = createRequire(import.meta.url)('electron-updater')

export function update(win: Electron.BrowserWindow) {
  const logger = createLogger('update')
  // When set to false, the update download will be triggered through the API
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'qiutongxue',
    repo: 'oba-live-tool',
  })

  // TODO: 设一个本地服务器模拟一下
  // autoUpdater.forceDevUpdateConfig = true
  // start check
  autoUpdater.on('checking-for-update', () => { })
  // update available
  autoUpdater.on('update-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', { update: true, version: app.getVersion(), newVersion: arg?.version })
  })
  // update not available
  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', { update: false, version: app.getVersion(), newVersion: arg?.version })
  })

  // Checking for updates
  ipcMain.handle('check-update', async () => {
    if (!app.isPackaged) {
      const error = new Error('The update feature is only available after the package.')
      return { message: error.message, error }
    }

    try {
      return await autoUpdater.checkForUpdatesAndNotify()
    }
    catch (error) {
      if (error instanceof Error)
        logger.error(error.message)
      return { message: '网络错误', error }
    }
  })

  // Start downloading and feedback on progress
  ipcMain.handle('start-download', (event: Electron.IpcMainInvokeEvent) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          logger.error('下载错误: ', error.message)
          // feedback download error message
          event.sender.send('update-error', { message: error.message, error })
        }
        else {
          // feedback update progress message
          event.sender.send('download-progress', progressInfo)
        }
      },
      () => {
        // feedback update downloaded message
        event.sender.send('update-downloaded')
      },
    )
  })

  // Install now
  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  autoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info))
  autoUpdater.on('error', (error: Error) => callback(error, null))
  autoUpdater.on('update-downloaded', complete)
  autoUpdater.downloadUpdate()
}
