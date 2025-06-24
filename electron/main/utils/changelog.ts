import { app } from 'electron'
import { marked } from 'marked'
import semver from 'semver'
import { sleep } from '#/utils/common'

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
      'https://fastly.jsdelivr.net/gh/TLS-802/TLS-live-tool@main/CHANGELOG.md'
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
