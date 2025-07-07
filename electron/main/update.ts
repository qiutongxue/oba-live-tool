import { createRequire } from 'node:module'
import { platform } from 'node:os'
import { app } from 'electron'
import type {
  AppUpdater,
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'

import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from './logger'
import { fetchChangelog, typedIpcMainHandle } from './utils'

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
  autoUpdater.on('update-available', async (arg: UpdateInfo) => {
    logger.info(
      `有可用更新！当前版本：${app.getVersion()}，新版本：${arg?.version}`,
    )

    let releaseNote = arg.releaseNotes

    // 这一段和 checkUpdate 不同步，可能已经发送了但是还没获得版本更新
    if (!releaseNote) {
      // 从 CHANGELOG.md 中获取
      releaseNote = await fetchChangelog()
    }

    win.webContents.send(IPC_CHANNELS.updater.updateAvailable, {
      update: true,
      version: app.getVersion(),
      newVersion: arg?.version,
      releaseNote,
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

  async function checkUpdateForGithub() {
    // 为 GitHub 设置基本更新配置
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'TLS-802',
      repo: 'TLS-live-tool',
      updaterCacheDirName: 'tls-live-tool-updater',
    })
    
    // 针对 macOS 平台的特殊处理
    if (platform() === 'darwin') {
      logger.info('检测到 macOS 平台，应用特定更新配置...')
      // 允许使用预发布版本，这会让 electron-updater 更宽松地处理文件格式
      autoUpdater.allowPrerelease = true;
      
      // 强制开启开发环境配置，增加兼容性
      autoUpdater.forceDevUpdateConfig = true;
      
      // 允许降级，以确保无论版本如何都能更新
      autoUpdater.allowDowngrade = true;
    }
    
    return await autoUpdater.checkForUpdatesAndNotify()
  }

  async function checkUpdateForGhProxy(source: string) {
    const version = await getLatestVersion()
    const assetsUrl = `https://github.com/TLS-802/TLS-live-tool/releases/download/v${version}/`
    const src = ensureURL(source)
    if (!src) {
      const msg = `更新源设置错误，你的更新源为 ${source}`
      return { message: msg, error: new Error(msg) }
    }
    // 自定义更新源
    const url = `${src}${assetsUrl}`
    autoUpdater.setFeedURL({
      provider: 'generic',
      url,
    })
    
    // 针对 macOS 平台的特殊处理
    if (platform() === 'darwin') {
      logger.info('检测到 macOS 平台，应用特定更新配置...')
      // 允许使用预发布版本，这会让 electron-updater 更宽松地处理文件格式
      autoUpdater.allowPrerelease = true;
      
      // 强制开启开发环境配置，增加兼容性
      autoUpdater.forceDevUpdateConfig = true;
      
      // 允许降级，以确保无论版本如何都能更新
      autoUpdater.allowDowngrade = true;
    }
    
    return await autoUpdater.checkForUpdatesAndNotify().catch(error => {
      const message = `网络错误: ${error instanceof Error ? error.message.split('\n')[0] : (error as string)}`
      const downloadURL = `${src}${assetsUrl}oba-live-tool_${version}.${platform() === 'darwin' ? 'dmg' : 'exe'}`
      return { message, error, downloadURL }
    })
  }

  // Checking for updates
  typedIpcMainHandle(
    IPC_CHANNELS.updater.checkUpdate,
    async (_, { source = 'github' }: { source: string }) => {
      if (!autoUpdater.forceDevUpdateConfig && !app.isPackaged) {
        const error = new Error(
          'The update feature is only available after the package.',
        )
        return { message: error.message, error }
      }
      
      const isRunningOnMac = platform() === 'darwin';
      logger.info(`检查更新中…… (更新源: ${source}, 系统平台: ${isRunningOnMac ? 'macOS' : 'Windows/Linux'})`)
      
      if (isRunningOnMac) {
        logger.info('针对 macOS 平台应用特殊更新配置，支持 DMG 格式更新文件')
      }

      try {
        if (source === 'github') {
          return await checkUpdateForGithub()
        }
        return await checkUpdateForGhProxy(source)
      } catch (error) {
        const message = `网络错误: ${error instanceof Error ? error.message : (error as string)}`
        logger.error(`更新检查失败: ${message}`)
        return { message, error: new Error(message) }
      }
    },
  )

  // Start downloading and feedback on progress
  typedIpcMainHandle(
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
  typedIpcMainHandle(IPC_CHANNELS.updater.quitAndInstall, () => {
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

export async function getLatestVersion() {
  // 从 package.json 获取最新版本号
  const version = await fetch(
    'https://fastly.jsdelivr.net/gh/TLS-802/TLS-live-tool@main/package.json',
  )
    .then(resp => resp.json())
    .then(data => data.version)
  logger.debug(`从 package.json 获取到的版本为 ${version}`)

  return `${version}`
}

function ensureURL(source: string) {
  // 确保链接的正确性
  try {
    const url = new URL(source)
    url.pathname = '/'
    return url.toString()
  } catch {
    return null
  }
}
