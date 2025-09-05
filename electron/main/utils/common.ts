import 'dotenv/config'
import { mergeWith } from 'lodash-es'

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

export function insertRandomSpaces(
  text: string,
  insertionProbability = 0.2,
): string {
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

function arrayReplaceCustomizer<Value1, Value2>(
  _objValue: Value1,
  srcValue: Value2,
) {
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
