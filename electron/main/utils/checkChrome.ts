import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { createLogger } from '../logger'

const execAsync = promisify(exec)
const logger = createLogger('ChromeChecker')

export async function findChrome(): Promise<string | null> {
  try {
    // Windows 常见的 Chrome 安装路径
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

    // 如果常见路径都没找到，尝试通过注册表查找
    try {
      const { stdout } = await execAsync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
      )
      const match = stdout.match(/REG_SZ\s+(.*)/)
      if (match && match[1]) {
        logger.debug('通过注册表找到 Chrome 浏览器:', match[1])
        return match[1].trim()
      }
    }
    catch {
      logger.error('未找到 Chrome 浏览器')
      return null
    }
  }
  catch (error) {
    logger.error('查找 Chrome 浏览器时出错:', error)
  }

  return null
}
