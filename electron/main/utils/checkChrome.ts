import { exec } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createLogger } from '../logger'

const execAsync = promisify(exec)
const logger = createLogger('ChromiumChecker')

async function findChromiumByCommonPath(commonPaths: string[]) {
  for (const path of commonPaths) {
    try {
      const expandedPath = await execAsync(`echo ${path}`)
      const { stdout: exists } = await execAsync(
        `if exist "${expandedPath.stdout.trim()}" echo true`,
      )
      if (exists.trim() === 'true') {
        return expandedPath.stdout.trim()
      }
    } catch {
      // continue
    }
  }
  return null
}

async function findChromiumByTasklist(executableName: string) {
  try {
    const { stdout: tasklistResult } = await execAsync(
      `tasklist /FI "imagename eq ${executableName}" /NH`,
    )
    const lines = tasklistResult.trim().split('\n')
    if (lines.length === 0 || lines[0].includes('No tasks')) {
      throw new Error(`${executableName} is not running`)
    }

    // 提取第一个 Chrome 进程的 PID
    const pid = lines[0].split(/\s+/)[1]
    if (!pid) throw new Error('Failed to extract PID')

    // 获取 Chrome 进程的可执行路径
    const { stdout: result } = await execAsync(
      // 使用 powershell 避免中文乱码
      `powershell -Command "Get-Process -Id ${pid} | Select-Object -ExpandProperty Path"`,
    )
    const path = result.trim()
    if (!path) {
      throw new Error('Failed to extract Chrome path')
    }
    return path
  } catch (err) {
    logger.warn(`找不到 ${executableName}：${err}`)
  }
  return null
}

async function findAppPathWithOsaScript(appName: string) {
  const command = `osascript -e 'POSIX path of (path to application "${appName}")'`
  try {
    const { stdout, stderr } = await execAsync(command)

    if (stderr) {
      if (!stdout.trim()) {
        logger.error(`osascript stderr for "${appName}": ${stderr.trim()}`)
        return null
      }
    }

    const appPath = stdout.trim()
    if (appPath) {
      const fullPath = path.join(appPath, 'Contents', 'MacOS', appName)
      if (fs.existsSync(fullPath)) {
        logger.info(`找到 ${appName} 路径：${fullPath}`)
        return fullPath
      }
      logger.error(`${appName} 路径不存在：${fullPath}`)
    }
    logger.error(`未找到 ${appName} 路径`)
    return null
  } catch (error) {
    logger.error(`${appName} 路径查找失败：${error}`)
    return null
  }
}

async function findChromiumOnWindows(
  commonPaths: string[],
  executableName: string,
) {
  const pathFromCommon = await findChromiumByCommonPath(commonPaths)
  if (pathFromCommon) {
    logger.info(`通过通用路径找到 ${executableName}: ${pathFromCommon}`)
    return pathFromCommon
  }

  // 其次尝试 tasklist
  const pathFromTasklist = await findChromiumByTasklist(executableName)
  if (pathFromTasklist) {
    logger.info(`通过 tasklist 找到 ${executableName}: ${pathFromTasklist}`)
    return pathFromTasklist
  }

  logger.warn(`未能找到 ${executableName} (Windows)`)
  return null // 明确返回 null 表示未找到
}

async function findChromiumOnMac(commonPaths: string[], appName: string) {
  for (const path of commonPaths) {
    if (fs.existsSync(path)) {
      logger.info(`通过预定义路径找到 ${appName}: ${path}`)
      return path
    }
  }

  const pathFromOsa = await findAppPathWithOsaScript(appName)
  if (pathFromOsa) {
    logger.info(`通过 osascript 找到 ${appName}: ${pathFromOsa}`)
    return pathFromOsa
  }

  logger.warn(`未能找到 ${appName} (macOS)`)
  return null // 明确返回 null 表示未找到
}

interface BrowserConfig {
  commonPaths: string[]
  name: string
}

interface PlatformConfig {
  edge: BrowserConfig
  chrome: BrowserConfig
  findChromium: (commonPaths: string[], name: string) => Promise<string | null>
}

const windowsConfig: PlatformConfig = {
  edge: {
    commonPaths: [
      '%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    name: 'msedge.exe',
  },
  chrome: {
    commonPaths: [
      '%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe',
      '%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe',
      '%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe',
    ],
    name: 'chrome.exe',
  },
  findChromium: findChromiumOnWindows,
}

const macConfig: PlatformConfig = {
  edge: {
    commonPaths: [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ],
    // 注意：这里 'name' 应该用于 osascript，它需要应用名
    name: 'Microsoft Edge',
  },
  chrome: {
    commonPaths: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ],
    name: 'Google Chrome',
  },
  findChromium: findChromiumOnMac,
}

export async function findChromium(edge = false): Promise<string | null> {
  const platform = os.platform()
  let config: PlatformConfig

  if (platform === 'win32') {
    config = windowsConfig
  } else if (platform === 'darwin') {
    config = macConfig
  } else {
    logger.error(`不支持的操作系统: ${platform}`)
    return null
  }

  const browserConfig = edge
    ? [config.edge, config.chrome]
    : [config.chrome, config.edge]

  for (const cfg of browserConfig) {
    const path = await config.findChromium(cfg.commonPaths, cfg.name)
    if (path) {
      return path
    }
  }

  return null
}
