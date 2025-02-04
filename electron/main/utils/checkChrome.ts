import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { createLogger } from '../logger'

const execAsync = promisify(exec)
const logger = createLogger('ChromeChecker')

async function findChromeByCommonPath() {
  const commonPaths = [
    '%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe',
    '%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe',
    '%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe',
  ]

  for (const path of commonPaths) {
    try {
      const expandedPath = await execAsync(`echo ${path}`)
      const { stdout: exists } = await execAsync(`if exist "${expandedPath.stdout.trim()}" echo true`)
      if (exists.trim() === 'true') {
        logger.debug('找到 Chrome 浏览器:', expandedPath.stdout.trim())
        return expandedPath.stdout.trim()
      }
    }
    catch {
      continue
    }
  }
  return null
}

async function findChromeByTasklist() {
  try {
    const { stdout: tasklistResult } = await execAsync('tasklist /FI "imagename eq chrome.exe" /NH')
    const lines = tasklistResult.trim().split('\n')
    if (lines.length === 0 || lines[0].includes('No tasks')) {
      throw new Error('Chrome is not running')
    }

    // 提取第一个 Chrome 进程的 PID
    const pid = lines[0].split(/\s+/)[1]
    if (!pid)
      throw new Error('Failed to extract PID')

    // 使用 wmic 获取 Chrome 进程的可执行路径
    const { stdout: wmicResult } = await execAsync(`wmic process where "ProcessId=${pid}" get ExecutablePath`)
    // ExecutablePath
    // X:\xxxxx\chrome.exe
    const path = wmicResult.split('\n')[1].trim()
    if (!path) {
      throw new Error('Failed to extract Chrome path')
    }
    return path
  }
  catch (err) {
    logger.error('查找 Chrome 浏览器时出错:', err)
  }
  return null
}

export async function findChrome(): Promise<string | null> {
  // Windows 常见的 Chrome 安装路径
  const path = await findChromeByCommonPath() || await findChromeByTasklist()
  return path
}
