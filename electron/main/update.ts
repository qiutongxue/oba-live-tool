import { createRequire } from 'node:module'
import { app, ipcMain } from 'electron'
import type {
  AppUpdater,
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from './logger'

const { autoUpdater }: { autoUpdater: AppUpdater } = createRequire(
  import.meta.url,
)('electron-updater')
const logger = createLogger('update')

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
    logger.info(
      `有可用更新！当前版本：${app.getVersion()}，新版本：${arg?.version}`,
    )
    win.webContents.send(IPC_CHANNELS.updater.updateAvailable, {
      update: true,
      version: app.getVersion(),
      newVersion: arg?.version,
    })
  })
  // update not available
  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    logger.info(
      `无可用更新。当前版本：${app.getVersion()}，新版本：${arg?.version}`,
    )
    win.webContents.send(IPC_CHANNELS.updater.updateAvailable, {
      update: false,
      version: app.getVersion(),
      newVersion: arg?.version,
    })
  })

  // Checking for updates
  ipcMain.handle(
    IPC_CHANNELS.updater.checkUpdate,
    async (_, { source = 'github' }: { source: string }) => {
      if (!autoUpdater.forceDevUpdateConfig && !app.isPackaged) {
        const error = new Error(
          'The update feature is only available after the package.',
        )
        return { message: error.message, error }
      }
      logger.info(`检查更新中…… (更新源: ${source})`)
      try {
        if (source === 'github') {
          autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'qiutongxue',
            repo: 'oba-live-tool',
          })
        } else {
          if (source[source.length - 1] !== '/') source = `${source}/`
          // 自定义更新源
          const version = await getLatestVersion()
          const suffixUrl = `github.com/qiutongxue/oba-live-tool/releases/download/${version}/`
          const url = `${source}${suffixUrl}`
          autoUpdater.setFeedURL({
            provider: 'generic',
            url,
          })
        }

        return await autoUpdater.checkForUpdatesAndNotify()
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error(error.message)
          return { message: `网络错误: ${error.message}`, error }
        }
        logger.error(`什么错误${error}`)
        return { message: '网络错误', error }
      }
    },
  )

  // Start downloading and feedback on progress
  ipcMain.handle(
    IPC_CHANNELS.updater.startDownload,
    (event: Electron.IpcMainInvokeEvent) => {
      startDownload(
        (error, progressInfo) => {
          if (error) {
            logger.error('下载错误: ', error.message)
            // feedback download error message
            event.sender.send(IPC_CHANNELS.updater.updateError, {
              message: error.message,
              error,
            })
          } else {
            // feedback update progress message
            event.sender.send(
              IPC_CHANNELS.updater.downloadProgress,
              progressInfo,
            )
          }
        },
        () => {
          // feedback update downloaded message
          event.sender.send(IPC_CHANNELS.updater.updateDownloaded)
        },
      )
    },
  )

  // Install now
  ipcMain.handle(IPC_CHANNELS.updater.quitAndInstall, () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  autoUpdater.on('download-progress', (info: ProgressInfo) =>
    callback(null, info),
  )
  autoUpdater.on('error', (error: Error) => callback(error, null))
  autoUpdater.on('update-downloaded', complete)
  autoUpdater.downloadUpdate()
}

async function getLatestVersion() {
  // 从 package.json 获取最新版本号
  const version = await fetch(
    'https://fastly.jsdelivr.net/gh/qiutongxue/oba-live-tool@main/package.json',
  )
    .then(resp => resp.json())
    .then(data => data.version)
  logger.debug(`从 package.json 获取到的版本为 v${version}`)

  return `v${version}`
}
