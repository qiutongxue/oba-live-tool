import fs from 'node:fs/promises'
import path from 'node:path'
import {
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  app,
  ipcMain,
} from 'electron'
import { marked } from 'marked'
import type { Page } from 'playwright'
import semver from 'semver'
import type { IpcChannels } from 'shared/electron-api'

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export type RequiredWith<BaseType, Keys extends keyof BaseType> = Required<
  Pick<BaseType, Keys>
> &
  Omit<BaseType, Keys>

export async function cleanupScreenshotDir() {
  const screenshotDirPath = path.join(app.getPath('logs'), 'screenshot')
  const files = await fs.readdir(screenshotDirPath)
  // files 按照文件名排序（截图的文件名开头是日期）
  if (files.length >= 20) {
    // 直接暴力删除最早的 10 张图，留 10 张图的余量缓冲
    for (const file of files.slice(0, 10)) {
      const filePath = path.join(screenshotDirPath, file)
      await fs.rm(filePath)
    }
  }
}

export function getDateString(date: Date) {
  // 2025-03-21T12-00-00
  const $ = (num: number) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${$(date.getMonth() + 1)}-${$(date.getDate())}T${$(date.getHours())}-${$(date.getMinutes())}-${$(date.getSeconds())}`
}

export async function takeScreenshot(
  page: Page,
  taskName: string,
  accountName?: string,
) {
  const screenshotPath = path.join(
    app.getPath('logs'),
    'screenshot',
    `${getDateString(new Date())}-${taskName}${accountName ? `-${accountName}` : ''}.png`,
  )
  await cleanupScreenshotDir()
  await page.screenshot({ path: screenshotPath })
}

export function typedIpcMainHandle<Channel extends keyof IpcChannels>(
  channel: Channel,
  listener: (
    event: IpcMainInvokeEvent,
    ...args: Parameters<IpcChannels[Channel]>
  ) =>
    | ReturnType<IpcChannels[Channel]>
    | Promise<ReturnType<IpcChannels[Channel]>>, // 支持同步或异步返回
): void {
  ipcMain.handle(channel as string, listener) // 使用 as any 绕过内部类型检查，因为外部已保证类型安全
}

export function typedIpcMainOn<Channel extends keyof IpcChannels>(
  channel: Channel,
  listener: (
    event: IpcMainEvent,
    ...args: Parameters<IpcChannels[Channel]>
  ) => void,
): void {
  ipcMain.on(channel as string, listener)
}

// marked 生成的 html 要在新页面打开链接
{
  const renderer = new marked.Renderer()
  renderer.link = ({ href, title, text }) => {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`
  }

  marked.setOptions({ renderer })
}

export async function fetchChangelog() {
  try {
    // 去 CDN 找
    const changelogURL =
      'https://fastly.jsdelivr.net/gh/qiutongxue/oba-live-tool@main/CHANGELOG.md'
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

async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
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

async function timeoutFetch(url: string, timeout = 5000) {
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
