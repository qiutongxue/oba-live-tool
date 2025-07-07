import { createRequire } from 'node:module'
import { platform } from 'node:os'
import { app, shell } from 'electron'
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

  // macOS平台处理：强制使用DMG格式
  if (platform() === 'darwin') {
    // @ts-ignore - 这些是私有API，但我们需要强制设置这个选项
    autoUpdater.updateConfigPath = { updaterCacheDirName: 'tls-live-tool-updater' }
    // @ts-ignore - 设置macOS下允许使用DMG格式更新
    autoUpdater.configOnDisk.mac = { ...autoUpdater.configOnDisk.mac, useDoubleContent: false }
  }

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
    // macOS 平台的特殊处理，由于只有 DMG 文件，而 electron-updater 寻找 ZIP
    if (platform() === 'darwin') {
      return await checkMacOSUpdate()
    }

    // 非 macOS 平台继续使用原有逻辑
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'TLS-802',
      repo: 'TLS-live-tool',
    })
    return await autoUpdater.checkForUpdatesAndNotify()
  }

  async function checkMacOSUpdate() {
    const version = await getLatestVersion()
    const currentVersion = app.getVersion()
    
    // 检查是否需要更新
    if (version === currentVersion) {
      logger.info(`当前版本已是最新：${currentVersion}`)
      return { updateInfo: { version: currentVersion } }
    }
    
    // 构建 DMG 下载链接
    const downloadURL = `https://github.com/TLS-802/TLS-live-tool/releases/download/v${version}/TLS-live-tool_${version}.dmg`
    
    // 模拟 updateInfo 对象
    const updateInfo = { 
      version, 
      files: [{ url: downloadURL }],
      path: downloadURL,
      sha512: '', // 不提供校验值
      releaseName: `v${version}`
    }
    
    // 通知前端有可用更新
    win.webContents.send(IPC_CHANNELS.updater.updateAvailable, {
      update: true,
      version: currentVersion,
      newVersion: version,
      releaseNote: await fetchChangelog()
    })
    
    return { updateInfo }
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
    
    // macOS 平台的特殊处理
    if (platform() === 'darwin') {
      const downloadURL = `${src}${assetsUrl}TLS-live-tool_${version}.dmg`
      return { 
        updateInfo: { 
          version,
          files: [{ url: downloadURL }],
          path: downloadURL,
        },
        downloadURL
      }
    }
    
    autoUpdater.setFeedURL({
      provider: 'generic',
      url,
    })
    return await autoUpdater.checkForUpdatesAndNotify().catch(error => {
      const message = `网络错误: ${error instanceof Error ? error.message.split('\n')[0] : (error as string)}`
      const downloadURL = `${src}${assetsUrl}TLS-live-tool_${version}.${platform() === 'darwin' ? 'dmg' : 'exe'}`
      return { message, error, downloadURL }
    })
  }

  // 添加一个自定义下载 DMG 文件的函数
  async function downloadDMGFile(url: string): Promise<boolean> {
    try {
      // 对于 macOS，直接打开下载链接让用户手动下载和安装
      await shell.openExternal(url)
      return true
    } catch (error) {
      logger.error('打开下载链接失败:', error)
      return false
    }
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
      logger.info(`检查更新中…… (更新源: ${source})`)

      try {
        if (source === 'github') {
          return await checkUpdateForGithub()
        }
        return await checkUpdateForGhProxy(source)
      } catch (error) {
        const message = `网络错误: ${error instanceof Error ? error.message : (error as string)}`
        return { message, error: new Error(message) }
      }
    },
  )

  // Start downloading and feedback on progress
  typedIpcMainHandle(
    IPC_CHANNELS.updater.startDownload,
    async (event: Electron.IpcMainInvokeEvent, url?: string) => {
      // 如果提供了URL且是macOS平台，使用自定义下载方式
      if (url && platform() === 'darwin') {
        const success = await downloadDMGFile(url)
        if (success) {
          // 通知前端下载完成
          event.sender.send(IPC_CHANNELS.updater.updateDownloaded)
        } else {
          // 通知前端下载失败
          event.sender.send(IPC_CHANNELS.updater.updateError, {
            message: '打开下载链接失败',
            error: new Error('Failed to open download URL'),
          })
        }
        return
      }
      
      // 原有的下载逻辑
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
