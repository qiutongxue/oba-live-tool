import { createRequire } from 'node:module'
import { platform } from 'node:os'
import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type {
  AppUpdater,
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'

import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from './logger'
import { fetchChangelog, typedIpcMainHandle } from './utils'

const execAsync = promisify(exec)

const { autoUpdater }: { autoUpdater: AppUpdater } = createRequire(
  import.meta.url,
)('electron-updater')
const logger = createLogger('update')

// 标记是否使用 DMG 安装（模块级别，供所有函数访问）
let isDMGInstall = false
// 存储当前更新信息，用于 DMG 下载（模块级别，供所有函数访问）
let currentUpdateInfo: UpdateInfo | null = null

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

    // 保存更新信息，用于后续 DMG 下载
    currentUpdateInfo = arg

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
    const isMac = platform() === 'darwin'
    
    // 针对 macOS 平台，使用 generic provider 来支持 DMG 文件
    if (isMac) {
      logger.info('检测到 macOS 平台，使用 generic provider 支持 DMG 格式更新文件')
      
      // 获取最新版本号
      const version = await getLatestVersion()
      const baseUrl = 'https://github.com/TLS-802/TLS-live-tool/releases/download'
      
      // 使用 generic provider，指向包含 latest-mac.yml 的目录
      // 注意：这需要 GitHub Releases 中有 latest-mac.yml 文件
      // 如果没有，我们将回退到直接使用 DMG URL
      const feedUrl = `${baseUrl}/v${version}/`
      
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: feedUrl,
        updaterCacheDirName: 'tls-live-tool-updater',
      })
      
      // 配置选项
      autoUpdater.allowPrerelease = true
      autoUpdater.forceDevUpdateConfig = true
      autoUpdater.allowDowngrade = true
      
      try {
        return await autoUpdater.checkForUpdatesAndNotify()
      } catch (error) {
        // 如果 generic provider 失败（可能因为缺少 latest-mac.yml），
        // 我们手动构建更新信息
        logger.warn('Generic provider 检查失败，尝试手动构建更新信息:', error)
        
        // 手动获取版本信息并触发更新可用事件
        const currentVersion = app.getVersion()
        if (version && version !== currentVersion) {
          // 手动触发 update-available 事件
          const updateInfo: UpdateInfo = {
            version,
            files: [
              {
                url: `${feedUrl}TLS-live-tool_${version}.dmg`,
                sha512: '', // 如果需要可以后续获取
                size: 0,
              },
            ],
            path: `${feedUrl}TLS-live-tool_${version}.dmg`,
            sha512: '',
            releaseDate: new Date().toISOString(),
          }
          
          // 保存更新信息，用于后续 DMG 下载
          currentUpdateInfo = updateInfo
          
          // 触发更新可用事件
          autoUpdater.emit('update-available', updateInfo)
          
          // 返回符合 UpdateCheckResult 类型的对象
          // 由于我们已经通过事件通知了更新可用，这里返回 null 即可
          return null
        }
        
        // 如果版本相同或获取失败，返回错误格式
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          message: `更新检查失败: ${errorMessage}`,
          error: error instanceof Error ? error : new Error(String(error)),
        }
      }
    } else {
      // 非 macOS 平台，使用标准的 GitHub provider
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'TLS-802',
        repo: 'TLS-live-tool',
        updaterCacheDirName: 'tls-live-tool-updater',
      })
      
      return await autoUpdater.checkForUpdatesAndNotify()
    }
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
        currentUpdateInfo,
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
    if (isDMGInstall) {
      // DMG 安装已完成，直接重启应用
      logger.info('DMG 安装已完成，重启应用...')
      app.relaunch()
      app.quit()
    } else {
      // 使用标准的 electron-updater 安装流程
      autoUpdater.quitAndInstall(false, true)
    }
  })
}

async function downloadDMGFile(
  currentUpdateInfo: UpdateInfo,
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: () => void,
) {
  // 查找 DMG 文件的 URL
  const dmgFile = currentUpdateInfo.files?.find(file =>
    file.url?.endsWith('.dmg'),
  )
  
  if (!dmgFile?.url) {
    callback(new Error('未找到 DMG 文件'), null)
    return
  }
  
  const dmgUrl = dmgFile.url
  const version = currentUpdateInfo.version
  try {
    const tempDir = path.join(app.getPath('temp'), 'tls-live-tool-updater')
    await fs.mkdir(tempDir, { recursive: true })
    
    const dmgPath = path.join(tempDir, `TLS-live-tool_${version}.dmg`)
    
    logger.info(`开始下载 DMG 文件: ${dmgUrl}`)
    
    // 下载 DMG 文件
    const response = await fetch(dmgUrl)
    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`)
    }
    
    const contentLength = parseInt(
      response.headers.get('content-length') || '0',
      10,
    )
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // 写入文件
    await fs.writeFile(dmgPath, buffer)
    
    // 报告完成进度
    if (contentLength > 0) {
      callback(null, {
        percent: 100,
        bytesPerSecond: 0,
        total: contentLength,
        transferred: contentLength,
      } as ProgressInfo)
    }
    
    logger.info(`DMG 文件下载完成: ${dmgPath}`)
    
    // 挂载 DMG 文件
    logger.info('正在挂载 DMG 文件...')
    const { stdout: mountOutput } = await execAsync(
      `hdiutil attach "${dmgPath}" -nobrowse -readonly`,
    )
    const mountPoint = mountOutput
      .split('\n')
      .find(line => line.includes('/Volumes/'))
      ?.split('\t')[2]
      ?.trim()
    
    if (!mountPoint) {
      throw new Error('无法挂载 DMG 文件')
    }
    
    logger.info(`DMG 已挂载到: ${mountPoint}`)
    
    // 查找 .app 文件
    const appName = 'TLS-live-tool.app'
    const appPath = path.join(mountPoint, appName)
    
    try {
      await fs.access(appPath)
    } catch {
      throw new Error(`在 DMG 中找不到 ${appName}`)
    }
    
    // 复制应用到 Applications 文件夹
    const applicationsPath = '/Applications'
    const targetAppPath = path.join(applicationsPath, appName)
    
    logger.info(`正在复制应用到 ${targetAppPath}...`)
    
    // 如果应用已存在，先删除
    try {
      await fs.rm(targetAppPath, { recursive: true, force: true })
    } catch {
      // 忽略错误
    }
    
    // 复制应用
    await execAsync(`cp -R "${appPath}" "${targetAppPath}"`)
    
    logger.info('应用复制完成')
    
    // 卸载 DMG
    logger.info('正在卸载 DMG...')
    await execAsync(`hdiutil detach "${mountPoint}"`)
    
    // 删除临时 DMG 文件
    await fs.unlink(dmgPath).catch(() => {
      // 忽略删除错误
    })
    
    logger.info('DMG 文件处理完成')
    
    // 标记为 DMG 安装
    isDMGInstall = true
    
    // 触发完成事件
    complete()
  } catch (error) {
    logger.error('DMG 下载/安装失败:', error)
    callback(
      error instanceof Error ? error : new Error(String(error)),
      null,
    )
  }
}

function startDownload(
  currentUpdateInfo: UpdateInfo | null,
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  const isMac = platform() === 'darwin'
  
  // 在 macOS 上，如果检测到 ZIP 文件缺失错误，使用自定义 DMG 下载
  if (isMac && currentUpdateInfo) {
    // 查找 DMG 文件的 URL
    const dmgFile = currentUpdateInfo.files?.find(file =>
      file.url?.endsWith('.dmg'),
    )
    
    if (dmgFile?.url) {
      logger.info('检测到 DMG 文件，使用自定义下载逻辑')
        downloadDMGFile(
          currentUpdateInfo,
          callback,
          () => {
            // 标记为 DMG 安装
            isDMGInstall = true
            // 模拟 UpdateDownloadedEvent
            complete({
              version: currentUpdateInfo.version,
              files: currentUpdateInfo.files || [],
            } as UpdateDownloadedEvent)
          },
        )
      return
    }
  }
  
  // 标准下载流程
  const progressHandler = (info: ProgressInfo) => callback(null, info)
  const errorHandler = (error: Error) => {
    // 如果是 macOS 且错误是 ZIP 文件缺失，尝试使用 DMG
    if (
      isMac &&
      error.message.includes('ZIP file not provided') &&
      currentUpdateInfo
    ) {
      const dmgFile = currentUpdateInfo.files?.find(file =>
        file.url?.endsWith('.dmg'),
      )
      
      if (dmgFile?.url) {
        logger.info(
          '检测到 ZIP 文件缺失错误，切换到 DMG 文件下载',
        )
        // 移除监听器，避免重复触发
        autoUpdater.removeListener('download-progress', progressHandler)
        autoUpdater.removeListener('error', errorHandler)
        
        downloadDMGFile(
          currentUpdateInfo,
          callback,
          () => {
            // 标记为 DMG 安装
            isDMGInstall = true
            complete({
              version: currentUpdateInfo.version,
              files: currentUpdateInfo.files || [],
            } as UpdateDownloadedEvent)
          },
        )
        return
      }
    }
    
    // 移除监听器
    autoUpdater.removeListener('download-progress', progressHandler)
    autoUpdater.removeListener('error', errorHandler)
    autoUpdater.removeListener('update-downloaded', completeHandler)
    
    callback(error, null)
  }
  const completeHandler = (event: UpdateDownloadedEvent) => {
    // 移除监听器
    autoUpdater.removeListener('download-progress', progressHandler)
    autoUpdater.removeListener('error', errorHandler)
    autoUpdater.removeListener('update-downloaded', completeHandler)
    
    // 重置 DMG 安装标志（如果是标准安装）
    isDMGInstall = false
    
    complete(event)
  }
  
  autoUpdater.on('download-progress', progressHandler)
  autoUpdater.on('error', errorHandler)
  autoUpdater.on('update-downloaded', completeHandler)
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
