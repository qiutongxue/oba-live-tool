import assert from 'node:assert'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { ErrorFactory } from '@praha/error-factory'
import { createLogger } from '../logger'

const execAsync = promisify(exec)
const logger = createLogger('ChromiumChecker')

function findWindowsByCommonPath(relativePaths: string[]) {
  const roots = [
    process.env.ProgramFiles, // 'C:\Program Files'
    process.env['ProgramFiles(x86)'], // 'C:\Program Files (x86)'
    process.env.LocalAppData, // 'C:\Users\xxx\AppData\Local'
  ].filter((r): r is string => !!r) // 过滤掉 undefined

  // 2. 组合所有可能的完整路径
  for (const root of roots) {
    for (const relativePath of relativePaths) {
      const fullPath = path.join(root, relativePath)
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
    }
  }
  return null
}

async function findWindowsByPowerShell(processName: string) {
  try {
    // 移除扩展名 (chrome.exe -> chrome) 因为 Get-Process 使用的是进程名
    const name = path.parse(processName).name

    const command = `powershell -NoProfile -Command "Get-Process -Name '${name}' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path"`

    const { stdout } = await execAsync(command)
    const result = stdout.trim()

    if (result && fs.existsSync(result)) {
      return result
    }
  } catch (err) {
    logger.debug(`PowerShell 查找 ${processName} 失败 (可能未运行): ${err}`)
  }
  return null
}

async function findChromiumOnWindows(config: BrowserConfig) {
  const pathFromCommon = findWindowsByCommonPath(config.commonPaths)
  if (pathFromCommon) {
    logger.debug(`通过通用路径找到 ${config.name}: ${pathFromCommon}`)
    return pathFromCommon
  }

  const pathFromProcess = await findWindowsByPowerShell(config.name)
  if (pathFromProcess) {
    logger.debug(`通过进程列表找到 ${config.name}: ${pathFromProcess}`)
    return pathFromProcess
  }

  logger.warn(`未能找到 ${config.name} (Windows)`)
  return null
}

async function findChromiumOnMac(config: BrowserConfig) {
  for (const p of config.commonPaths) {
    if (fs.existsSync(p)) {
      logger.debug(`通过预定义路径找到 ${config.name}: ${p}`)
      return p
    }
  }

  // 使用 mdfind (Spotlight) 或 osascript
  const appName = config.appNameForMac || config.name // 处理 .app 名字
  const command = `osascript -e 'POSIX path of (path to application "${appName}")'`

  try {
    const { stdout } = await execAsync(command)
    const appRoot = stdout.trim() // e.g. /Applications/Google Chrome.app/

    if (appRoot) {
      // 构造二进制路径: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
      const binaryPath = path.join(appRoot, 'Contents', 'MacOS', appName)
      if (fs.existsSync(binaryPath)) {
        logger.debug(`通过 osascript 找到: ${binaryPath}`)
        return binaryPath
      }
    }
  } catch (error) {
    logger.debug(`osascript 查找失败 ${appName}: ${error}`)
  }

  logger.warn(`未能找到 ${config.name} (MacOS)`)
  return null
}

interface BrowserConfig {
  // Windows 下存的是相对路径，Mac 下是绝对路径
  commonPaths: string[]
  name: string // Windows 下是 exe 名 (chrome.exe)
  appNameForMac?: string // Mac 下是应用名 (Google Chrome)
}

const CONFIGS = {
  win32: {
    edge: {
      commonPaths: ['Microsoft/Edge/Application/msedge.exe'],
      name: 'msedge.exe',
    },
    chrome: {
      commonPaths: ['Google/Chrome/Application/chrome.exe'],
      name: 'chrome.exe',
    },
    finder: findChromiumOnWindows,
  },
  darwin: {
    edge: {
      commonPaths: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      name: 'Microsoft Edge',
      appNameForMac: 'Microsoft Edge', // 用于 osascript
    },
    chrome: {
      commonPaths: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      name: 'Google Chrome',
      appNameForMac: 'Google Chrome',
    },
    finder: findChromiumOnMac,
  },
}

export async function findChromium(edge = false): Promise<string> {
  const platform = os.platform()
  assert(platform === 'win32' || platform === 'darwin')
  const platformConfig = CONFIGS[platform]

  const targets = edge
    ? [platformConfig.edge, platformConfig.chrome]
    : [platformConfig.chrome, platformConfig.edge]

  for (const browser of targets) {
    const result = await platformConfig.finder(browser)
    if (result) {
      logger.info(`找到浏览器路径：${result}`)
      return result
    }
  }

  logger.error('未找到任何浏览器路径，请手动选择')
  throw new ChromiumNotFoundError()
}

class ChromiumNotFoundError extends ErrorFactory({
  name: 'ChromiumNotFoundError',
  message: '未找到浏览器的可执行文件',
}) {}
