import { exec } from 'node:child_process'
import fs from 'node:fs'
import { platform } from 'node:os'
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

async function findChromiumOnWindows() {
  const find = async (commonPaths: string[], executableName: string) => {
    const path =
      (await findChromiumByCommonPath(commonPaths)) ||
      (await findChromiumByTasklist(executableName))
    return path
  }
  const chromePath = await find(
    [
      '%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe',
      '%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe',
      '%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe',
    ],
    'chrome.exe',
  )
  const edgePath = await find(
    [
      '%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    'msedge.exe',
  )
  return { chromePath, edgePath }
}

async function findChromiumOnMac() {
  const find = async (commonPaths: string, executableName: string) => {
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        logger.info(`找到 ${executableName} 路径：${path}`)
        return path
      }
    }
    return await findAppPathWithOsaScript(executableName)
  }
  const chromePath = await find(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'Google Chrome',
  )
  const edgePath = await find(
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'Microsoft Edge',
  )
  return { chromePath, edgePath }
}

export async function findChromium(edge = false): Promise<string | null> {
  switch (platform()) {
    case 'win32': {
      const { chromePath, edgePath } = await findChromiumOnWindows()
      return (edge && edgePath) || chromePath || edgePath
    }
    case 'darwin': {
      const { chromePath, edgePath } = await findChromiumOnMac()
      return (edge && edgePath) || chromePath || edgePath
    }
    default: {
      logger.error(`不支持的平台：${platform()}`)
      return null
    }
  }
}
