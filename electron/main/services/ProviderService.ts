import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import { providers as defaultProviders } from 'shared/providers'
import { emitter } from '#/event/eventBus'
import { createLogger } from '#/logger'

/**
 * GitHub 仓库信息，用于构建各 CDN 源 URL。
 * 修改这里可切换数据源仓库。
 */
const REPO_INFO = {
  owner: 'qiutongxue',
  name: 'oba-live-tool',
  branch: 'main',
  file: 'providers.json',
}

/** 多 CDN 源，按优先级依次尝试 */
const PROVIDER_URLS = [
  // 1. jsDelivr CDN
  `https://cdn.jsdelivr.net/gh/${REPO_INFO.owner}/${REPO_INFO.name}@${REPO_INFO.branch}/${REPO_INFO.file}`,
  // 2. 极简CDN (ghproxy 镜像)
  `https://gh-proxy.com/raw.githubusercontent.com/${REPO_INFO.owner}/${REPO_INFO.name}/${REPO_INFO.branch}/${REPO_INFO.file}`,
  // 3. GitHub raw — 兜底
  `https://raw.githubusercontent.com/${REPO_INFO.owner}/${REPO_INFO.name}/${REPO_INFO.branch}/${REPO_INFO.file}`,
]

const PROVIDERS_CACHE_FILE = 'providers.cache.json'

export class ProviderService {
  private logger = createLogger('ProviderService')
  private cachePath: string
  private _providers: Record<string, ProviderInfo> = { ...defaultProviders }

  constructor() {
    this.cachePath = path.join(app.getPath('userData'), PROVIDERS_CACHE_FILE)
  }

  get providers(): Record<string, ProviderInfo> {
    return this._providers
  }

  async initialize(): Promise<void> {
    // 1. 先加载本地缓存（同步），保证即使离线也有数据
    await this.loadFromCache()
    // 2. 后台异步从 CDN 获取最新数据，不阻塞窗口创建
    this.fetchRemote().catch(() => {})
  }

  private async loadFromCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8')
      const cached = JSON.parse(data)
      this._providers = { ...defaultProviders, ...cached }
      this.logger.debug('已从本地缓存加载 providers')
    } catch {
      this.logger.verbose('未找到 providers 缓存，将使用内置默认配置')
    }
  }

  /** 依次尝试各 CDN 源，成功后更新缓存并推送 */
  private async fetchRemote(): Promise<void> {
    const errors: Array<{ url: string; error: unknown }> = []

    for (const url of PROVIDER_URLS) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`)
        }
        const data: Record<string, ProviderInfo> = await response.json()
        this._providers = { ...defaultProviders, ...data }
        await fs.writeFile(this.cachePath, JSON.stringify(this._providers, null, 2), 'utf-8')
        emitter.emit('providers-updated', this._providers)
        this.logger.success(`已从 CDN 更新 providers: ${url}`)
        return
      } catch (error) {
        errors.push({ url, error })
        this.logger.warn(`CDN 源获取失败: ${url}`, error)
      }
    }

    this.logger.error(
      `所有 CDN 源均获取失败 (${errors.length}/${PROVIDER_URLS.length})，将使用本地数据`,
    )
  }
}

export const providerService = new ProviderService()
