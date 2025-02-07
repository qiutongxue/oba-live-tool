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
const logger = createLogger('update')

async function getLatestVersion() {
  // 从 package.json 获取最新版本号
  const version = await fetch('https://gh-proxy.com/raw.githubusercontent.com/qiutongxue/oba-live-tool/main/package.json')
    .then(resp => resp.json())
    .then(data => data.version)
  logger.debug(`从 package.json 获取到的版本为 v${version}`)
  return `v${version}`
}

export async function update(win: Electron.BrowserWindow) {
  // When set to false, the update download will be triggered through the API
  // TODO: 设一个本地服务器模拟一下
  autoUpdater.forceDevUpdateConfig = true

  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  // start check
  autoUpdater.on('checking-for-update', () => {})
  // update available
  autoUpdater.on('update-available', (arg: UpdateInfo) => {
    logger.info(`有可用更新！当前版本：${app.getVersion()}，新版本：${arg?.version}`)
    win.webContents.send('update-can-available', { update: true, version: app.getVersion(), newVersion: arg?.version })
  })
  // update not available
  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    logger.info(`无可用更新。当前版本：${app.getVersion()}，新版本：${arg?.version}`)
    win.webContents.send('update-can-available', { update: false, version: app.getVersion(), newVersion: arg?.version })
  })

  // Checking for updates
  ipcMain.handle('check-update', async (_, { source = 'gh-proxy' }) => {
    if (!autoUpdater.forceDevUpdateConfig && !app.isPackaged) {
      const error = new Error('The update feature is only available after the package.')
      return { message: error.message, error }
    }
    logger.info(`检查更新中…… (更新源: ${source})`)
    try {
      if (source === 'gh-proxy') {
        const version = await getLatestVersion()
        autoUpdater.setFeedURL({
          provider: 'generic',
          url: `https://gh-proxy.com/github.com/qiutongxue/oba-live-tool/releases/download/${version}/`,
        })
      }
      else {
        autoUpdater.setFeedURL({
          provider: 'github',
          owner: 'qiutongxue',
          repo: 'oba-live-tool',
        })
      }
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
