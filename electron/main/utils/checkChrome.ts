import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { createLogger } from '../logger'

const execAsync = promisify(exec)
const logger = createLogger('ChromiumChecker')

const constants = {
  chrome: {
    commonPaths: [
      '%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe',
      '%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe',
      '%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe',
    ],
    executableName: 'chrome.exe',
  },
  edge: {
    commonPaths: [
      '%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    executableName: 'msedge.exe',
  },
}

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

async function findChrome(): Promise<string | null> {
  const path =
    (await findChromiumByCommonPath(constants.chrome.commonPaths)) ||
    (await findChromiumByTasklist(constants.chrome.executableName))
  return path
}

async function findEdge(): Promise<string | null> {
  const path =
    (await findChromiumByCommonPath(constants.edge.commonPaths)) ||
    (await findChromiumByTasklist(constants.edge.executableName))
  return path
}

export async function findChromium(edge = false): Promise<string | null> {
  const chromePath = await findChrome()
  const edgePath = await findEdge()
  return (edge && edgePath) || chromePath || edgePath
}
