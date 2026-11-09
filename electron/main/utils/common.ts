import { Result } from '@praha/byethrow'
import { AbortError } from '#/errors/AppError'
import 'dotenv/config'
import { mergeWith } from 'lodash-es'

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function abortableSleep(
  ms: number,
  signal?: AbortSignal,
): Result.ResultAsync<void, Error> {
  function sleepPromise() {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new AbortError())
        return
      }
      const timer = setTimeout(resolve, ms)
      const onAbort = () => {
        cleanup()
        reject(new AbortError())
      }
      const cleanup = () => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
      }
      signal?.addEventListener('abort', onAbort)
    })
  }
  return Result.try({
    immediate: true,
    try: async () => await sleepPromise(),
    catch: () => new AbortError(),
  })
}

export function isDev() {
  return process.env.NODE_ENV === 'development'
}

export function isMockTest() {
  return process.env.MOCK_TEST === 'true'
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * 把「5分钟」「30秒」「1小时」这类时长文本转成毫秒；无法识别返回 null。
 * 用途：营销循环记录发放时长，估算下一次检查时间。
 */
export function parseDurationText(text: string): number | null {
  const matched = text.replace(/\s/g, '').match(/^(\d+)(秒|分钟|分|小时)$/)
  if (!matched) return null
  const value = Number(matched[1])
  switch (matched[2]) {
    case '秒':
      return value * 1000
    case '小时':
      return value * 3600 * 1000
    default:
      return value * 60 * 1000
  }
}

/**
 * 从状态文本里解析剩余时间，如「发放中 03:31」→ 211000（毫秒）。
 * 支持 mm:ss 与 hh:mm:ss；解析不到或超出合理范围（> 6 小时）返回 null。
 */
export function parseCountdownText(text: string): number | null {
  const matched = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!matched) return null
  const hasHours = matched[3] !== undefined
  const hours = hasHours ? Number(matched[1]) : 0
  const minutes = hasHours ? Number(matched[2]) : Number(matched[1])
  const seconds = hasHours ? Number(matched[3]) : Number(matched[2])
  const ms = ((hours * 60 + minutes) * 60 + seconds) * 1000
  if (ms < 0 || ms > 6 * 3600 * 1000) return null
  return ms
}

/**
 * 极简异步互斥锁（先到先得，排队执行）。
 *
 * 用途：多个任务共用**同一个页面**做 DOM 操作时（自动弹窗 / 自动发言 / 营销循环），
 * 一方的操作会让页面重渲染，把另一方刚拿到的 ElementHandle 挤掉，
 * 报 `Element is not attached to the DOM`。用这把锁把页面操作串行化即可避免互相踩。
 *
 * 注意：不要嵌套使用同一把锁（会死锁）。
 */
export class AsyncLock {
  private tail: Promise<unknown> = Promise.resolve()

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task)
    // 无论成败都让链条继续，避免一次失败卡死后续所有排队者
    this.tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

export function insertRandomSpaces(text: string, insertionProbability = 0.2): string {
  // 不处理空字符串或概率为0的情况
  if (!text || insertionProbability <= 0) return text
  // 不能超过 50 个字符，且不要添加太多的空格
  let maxSpaces = Math.min(50 - text.length, 5)
  if (maxSpaces <= 0) return text

  // 限制概率在合理范围内
  const probability = Math.min(Math.max(insertionProbability, 0), 0.5)

  const result: string[] = []
  let lastWasSpace = false // 避免连续多个空格

  const SPACE_CHAR = ' '

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    result.push(char)
    if (maxSpaces <= 0) {
      continue
    }
    // 不在空格后立即再插入空格，避免过多空格影响阅读
    if (
      !lastWasSpace &&
      char !== SPACE_CHAR &&
      i < text.length - 1 && // 不在末尾插入
      text[i + 1] !== SPACE_CHAR && // 下一个字符不是空格
      Math.random() < probability
    ) {
      // 随机决定插入1个还是2个空格(小概率)
      const spacesToInsert = Math.min(maxSpaces, Math.random() < 0.9 ? 1 : 2)
      result.push(SPACE_CHAR.repeat(spacesToInsert))
      maxSpaces -= spacesToInsert
      lastWasSpace = true
    } else {
      lastWasSpace = char === SPACE_CHAR
    }
  }

  // 如果没插入空格，就随便找个地方插一个
  if (result.length === text.length) {
    const index = randomInt(0, result.length - 1)
    result.splice(index, 0, SPACE_CHAR)
  }

  return result.join('')
}

// 消息存在变量，用 {A/B/C} 表示
const VAR_REG = /\{([^}]+)\}/g

export function replaceVariant(msg: string) {
  return msg.replace(VAR_REG, (_match, group) => {
    const options = group.split('/')
    const randomIndex = randomInt(0, options.length - 1)
    return options[randomIndex]
  })
}

function arrayReplaceCustomizer<Value1, Value2>(_objValue: Value1, srcValue: Value2) {
  if (Array.isArray(srcValue)) {
    // 如果源对象的属性值是一个数组 (即 configUpdates 里的值是数组)，
    // 则直接返回这个源数组，它将替换掉目标对象中的对应数组。
    return srcValue
  }
}

/**
 * 使用 lodash.merge 合并对象，但是不会合并数组
 */
export function mergeWithoutArray<Object1, Object2>(
  objValue: Object1,
  srcValue: Object2,
): Object1 & Object2 {
  return mergeWith({}, objValue, srcValue, arrayReplaceCustomizer)
}
