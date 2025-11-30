import { createRequire } from 'node:module'
import { platform } from 'node:os'
import { app } from 'electron'
import type { AppUpdater, ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { marked } from 'marked'
import semver from 'semver'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import windowManager from '#/windowManager'
import packageJson from '../../../package.json'
import { createLogger } from '../logger'
import { errorMessage, sleep } from '../utils'

const GITHUB_OWNER = 'TLS-802'
const GITHUB_REPO = 'TLS-live-tool'
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

class UpdateManager {
  private autoUpdater: AppUpdater
  private latestVersion: string | null = null
  private releaseNotes: Record<string, string> = {}
  constructor() {
    const { autoUpdater }: { autoUpdater: AppUpdater } = createRequire(import.meta.url)(
      'electron-updater',
    )
    this.autoUpdater = autoUpdater
    this.configureUpdater()
    this.registerEventListener()
  }

  private configureUpdater() {
    this.autoUpdater.forceDevUpdateConfig = true
    this.autoUpdater.disableWebInstaller = false
    this.autoUpdater.allowDowngrade = false
  }

  private registerEventListener() {
    this.autoUpdater.on('checking-for-update', () => {
      logger.debug('检查更新流程已启动...')
    })

    this.autoUpdater.on('update-available', async (info: UpdateInfo) => {
      logger.info(`有可用更新！当前版本：${app.getVersion()}，新版本：${info.version}`)

      const releaseNote = await this.fetchChangelog()
      windowManager.send(IPC_CHANNELS.updater.updateAvailable, {
        update: true,
        version: app.getVersion(),
        newVersion: info.version,
        releaseNote,
      })
    })

    this.autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logger.info(`无可用更新。当前版本：${app.getVersion()}，新版本：${info.version}`)
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
      logger.info(`${event.version} 更新下载完成!`)
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
    // github 不需要关闭 noCache，requestHeaders 默认就是 null
    this.autoUpdater.requestHeaders = null
    this.autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
    })
    return this.autoUpdater.checkForUpdates()
  }

  private async checkUpdateForGhProxy(source: string) {
    let sourceURL: URL
    try {
      sourceURL = new URL(source)
    } catch {
      const msg = `更新源设置错误，你的更新源为 ${source}`
      throw new Error(msg)
    }
    const { assetsURL, downloadURL } = await this.getAssetsURL(sourceURL)
    // 自定义更新源
    this.autoUpdater.setFeedURL({
      provider: 'generic',
      url: `${sourceURL}${assetsURL}`,
    })
    try {
      return await this.autoUpdater.checkForUpdates()
    } catch (error) {
      const message = `网络错误: ${errorMessage(error).split('\n')[0]}`
      windowManager.send(IPC_CHANNELS.updater.updateError, { message, downloadURL })
      throw new Error(message)
    }
  }

  private async fetchChangelog() {
    if (this.latestVersion && this.releaseNotes[this.latestVersion]) {
      return this.releaseNotes[this.latestVersion]
    }
    try {
      // 去 CDN 找
      const changelogURL = new URL(`${GITHUB_OWNER}/${GITHUB_REPO}@main/CHANGELOG.md`, CDN_URL)
      const changelogContent = await fetchWithRetry(changelogURL).then(res => res?.text())
      if (changelogContent) {
        // 找到新版本到当前版本的所有更新日志
        const updateLog = extractChanges(changelogContent, app.getVersion())
        // markdown 转成 html
        const releaseNote = await marked.parse(updateLog)
        if (this.latestVersion) {
          this.releaseNotes[this.latestVersion] = releaseNote
        }
        return releaseNote
      }
    } catch {
      return undefined
    }
  }

  public async checkForUpdates(source = 'github') {
    // 默认情况会在请求的资源 URL 后面添加查询参数 noCache
    // 但是很多 proxy 站点并没有针对 query 优化，就会导致 404
    // 本身通过 proxy 访问的 URL 就带有版本号，所以 noCache 完全没作用
    // 通过下面的 hack 可以不附带 noCache 查询
    // https://github.com/electron-userland/electron-builder/issues/3415#issuecomment-433082387
    this.autoUpdater.requestHeaders = { authorization: '' }
    try {
      if (!app.isPackaged) {
        if (!this.autoUpdater.forceDevUpdateConfig) {
          const message = '更新功能仅在应用打包后可用。'
          windowManager.send(IPC_CHANNELS.updater.updateError, { message })
          return
        }
        // 开发环境下的更新，要先启动 slow-server (pnpm slow-server)
        // await this.autoUpdater.checkForUpdates()
        // return
      }
      logger.debug(`检查更新中…… (更新源: ${source})`)

      if (source === 'github') {
        await this.checkUpdateForGithub()
      } else {
        await this.checkUpdateForGhProxy(source)
      }
    } catch (error) {
      const message = `检查更新时发生错误: ${errorMessage(error)}`
      logger.error(message)
      windowManager.send(IPC_CHANNELS.updater.updateError, { message })
    }
  }

  public async getAssetsURL(proxy: URL) {
    const assetsURL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${this.latestVersion}/`
    const downloadURL = `${proxy}${assetsURL}${PRODUCT_NAME}_${this.latestVersion}.${platform() === 'darwin' ? 'dmg' : 'exe'}`
    return { assetsURL, downloadURL }
  }

  public async checkUpdateVersion() {
    const latestVersion = await getLatestVersion()
    if (!latestVersion) {
      return
    }
    this.latestVersion = latestVersion
    const currentVersion = app.getVersion()
    if (semver.lt(currentVersion, latestVersion)) {
      // 先用 log 提示更新
      logger.info(
        `检查到可用更新：${currentVersion} -> ${latestVersion}，可前往应用设置-软件更新处手动更新`,
      )
      const releaseNote = await this.fetchChangelog()

      return {
        currentVersion,
        latestVersion,
        releaseNote,
      }
    }
  }

  public async silentCheckForUpdate() {
    try {
      const result = await this.checkUpdateVersion()
      if (result) {
        windowManager.send(IPC_CHANNELS.app.notifyUpdate, { ...result })
      }
    } catch (err) {
      logger.debug(`静默检查更新失败：${err}`)
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
