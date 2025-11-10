import { createRequire } from 'node:module'
import { platform } from 'node:os'
import { app } from 'electron'
import type {
  AppUpdater,
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'
import { marked } from 'marked'
import semver from 'semver'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import windowManager from '#/windowManager'
import packageJson from '../../../package.json'
import { createLogger } from '../logger'
import { errorMessage, sleep } from '../utils'

const GITHUB_OWNER = 'qiutongxue'
const GITHUB_REPO = 'oba-live-tool'
const CDN_URL = 'https://fastly.jsdelivr.net/gh/'
const PRODUCT_NAME = packageJson.name

const logger = createLogger('update')

{
  // marked 生成的 html 要在新页面打开链接
  const renderer = new marked.Renderer()
  renderer.link = ({ href, title, text }) => {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`
  }
  marked.setOptions({ renderer })
}

async function fetchChangelog() {
  try {
    // 去 CDN 找
    const changelogURL = new URL(
      `${GITHUB_OWNER}/${GITHUB_REPO}@main/CHANGELOG.md`,
      CDN_URL,
    )
    const changelogContent = await fetchWithRetry(changelogURL).then(res =>
      res?.text(),
    )
    if (changelogContent) {
      // 找到新版本到当前版本的所有更新日志
      const updateLog = extractChanges(changelogContent, app.getVersion())
      // markdown 转成 html
      return await marked.parse(updateLog)
    }
  } catch {
    return undefined
  }
}

function extractChanges(changelogContent: string, userVersion: string): string {
  const lines = changelogContent.split('\n')
  const result = []

  for (const line of lines) {
    const versionMatch = line.match(/^##\s+v?([0-9]+\.[0-9]+\.[0-9]+)/) // 匹配版本 "## vX.Y.Z" 或 "## X.Y.Z"

    if (versionMatch) {
      const versionInLog = versionMatch[1] // X.Y.Z
      // 遇到小于等于当前版本的就停止
      if (semver.lte(versionInLog, userVersion)) {
        break
      }
    }

    result.push(line)
  }

  // slice(1) 负责过滤开头的 # Changelog
  return result.slice(1).join('\n')
}

async function fetchWithRetry(url: string | URL, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = (await timeoutFetch(url)) as Response
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (e) {
      if (i === retries - 1) throw e
      await sleep(delay)
    }
  }
}

async function timeoutFetch(url: string | URL, timeout = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // 不加上 User-Agent 会访问超时
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Fetch timeout')
    }
    throw err
  }
}

async function getLatestVersion() {
  try {
    // 从 package.json 获取最新版本号
    const version = await fetch(
      new URL(`${GITHUB_OWNER}/${GITHUB_REPO}@main/package.json`, CDN_URL),
    )
      .then(resp => resp.json())
      .then(data => data.version)
    logger.debug(`从 package.json 获取到的版本为 ${version}`)
    return `${version}`
  } catch (error) {
    logger.error('获取最新版本失败', error)
    return null
  }
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

class UpdateManager {
  private autoUpdater: AppUpdater
  constructor() {
    const { autoUpdater }: { autoUpdater: AppUpdater } = createRequire(
      import.meta.url,
    )('electron-updater')
    this.autoUpdater = autoUpdater
    this.configureUpdater()
    this.registerEventListener()
  }

  private configureUpdater() {
    // TODO: 设一个本地服务器模拟一下
    this.autoUpdater.forceDevUpdateConfig = true
    this.autoUpdater.autoDownload = false
    this.autoUpdater.disableWebInstaller = false
    this.autoUpdater.allowDowngrade = false
  }

  private registerEventListener() {
    this.autoUpdater.on('checking-for-update', () => {
      logger.debug('检查更新流程已启动...')
    })

    this.autoUpdater.on('update-available', async (info: UpdateInfo) => {
      logger.info(
        `有可用更新！当前版本：${app.getVersion()}，新版本：${info.version}`,
      )
      let releaseNote = info.releaseNotes as string | undefined
      // 这一段和 checkUpdate 不同步，可能已经发送了但是还没获得版本更新
      if (!releaseNote) {
        // 从 CHANGELOG.md 中获取
        releaseNote = await fetchChangelog()
      }
      windowManager.send(IPC_CHANNELS.updater.updateAvailable, {
        update: true,
        version: app.getVersion(),
        newVersion: info.version,
        releaseNote,
      })
    })

    this.autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logger.info(
        `无可用更新。当前版本：${app.getVersion()}，新版本：${info.version}`,
      )
      windowManager.send(IPC_CHANNELS.updater.updateAvailable, {
        update: false,
        version: app.getVersion(),
        newVersion: info.version,
      })
    })

    this.autoUpdater.on('download-progress', (progressInfo: ProgressInfo) => {
      windowManager.send(IPC_CHANNELS.updater.downloadProgress, progressInfo)
    })

    this.autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
      logger.info('更新下载完成!', event)
      windowManager.send(IPC_CHANNELS.updater.updateDownloaded, event)
    })

    this.autoUpdater.on('error', (error: Error) => {
      logger.error('更新出错: ', error.message)
      windowManager.send(IPC_CHANNELS.updater.updateError, {
        message: error.message,
        error,
      })
    })
  }

  private async checkUpdateForGithub() {
    this.autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
    })
    return this.autoUpdater.checkForUpdatesAndNotify()
  }

  private async checkUpdateForGhProxy(source: string) {
    const version = await getLatestVersion()
    if (!version) {
      const msg = '无法获取版本号，请检查网络连接。'
      throw new Error(msg)
    }
    const assetsUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/`
    const src = ensureURL(source)
    if (!src) {
      const msg = `更新源设置错误，你的更新源为 ${source}`
      throw new Error(msg)
    }
    // 自定义更新源
    this.autoUpdater.setFeedURL({
      provider: 'generic',
      url: `${src}${assetsUrl}`,
    })
    try {
      return await this.autoUpdater.checkForUpdatesAndNotify()
    } catch (error) {
      const message = `网络错误: ${errorMessage(error).split('\n')[0]}`
      const downloadURL = `${src}${assetsUrl}${PRODUCT_NAME}_${version}.${platform() === 'darwin' ? 'dmg' : 'exe'}`
      return { message, error: error as Error, downloadURL }
    }
  }

  public async checkForUpdates(source = 'github') {
    if (!this.autoUpdater.forceDevUpdateConfig && !app.isPackaged) {
      const message = '更新功能仅在应用打包后可用。'
      return { message, error: new Error(message) }
    }
    logger.info(`检查更新中…… (更新源: ${source})`)

    try {
      if (source === 'github') {
        return await this.checkUpdateForGithub()
      }
      return await this.checkUpdateForGhProxy(source)
    } catch (error) {
      const message = `检查更新时发生错误: ${errorMessage(error)}`
      logger.error(message)
      return { message, error: error as Error }
    }
  }

  public async silentCheckForUpdate() {
    try {
      const latestVersion = await getLatestVersion()
      if (!latestVersion) {
        return
      }
      const currentVersion = app.getVersion()
      if (semver.lt(currentVersion, latestVersion)) {
        logger.info(
          `检查到可用更新：${currentVersion} -> ${latestVersion}，可前往应用设置-软件更新处手动更新`,
        )

        // 获取 CHANGELOG.md
        const releaseNote = await fetchChangelog() // html

        windowManager.send(IPC_CHANNELS.app.notifyUpdate, {
          currentVersion,
          latestVersion,
          releaseNote,
        })
      }
    } catch (err) {
      logger.debug(`检查更新失败：${err}`)
    }
  }

  public startDownload() {
    logger.info('开始下载更新……')
    this.autoUpdater.downloadUpdate()
  }

  public quitAndInstall() {
    logger.info('准备退出并安装更新')
    this.autoUpdater.quitAndInstall(false, true)
  }
}

export const updateManager = new UpdateManager()
