import { version as APP_VERSION } from '../../package.json'

/**
 * 存储版本信息的键名
 */
const STORAGE_VERSION_KEY = 'storage-version'

/**
 * 当前应用使用的所有 localStorage 键名
 * 用于账号删除时清理数据
 */
export const STORAGE_KEYS = {
  // 账号相关
  ACCOUNTS: 'accounts-storage',

  // 各功能模块配置（按账号存储 contexts）
  AUTO_MESSAGE: 'auto-message-storage',
  AUTO_REPLY: 'auto-reply',
  AUTO_POPUP: 'auto-popup-storage',
  LIVE_CONTROL: 'live-control-storage',
  CHROME_CONFIG: 'chrome-config',

  // 全局配置（不按账号存储）
  AI_CHAT: 'ai-chat-storage',
  UPDATE: 'update-storage',
  DEV_MODE: 'dev-mode-storage',
  STORAGE_VERSION: STORAGE_VERSION_KEY,
} as const

/**
 * 已废弃的 localStorage 键名（历史版本使用）
 * 用于版本迁移时清理旧数据
 */
export const DEPRECATED_STORAGE_KEYS: string[] = getAllStorageKeys().filter(
  key =>
    !Object.values(STORAGE_KEYS).includes(key as (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]),
)

/**
 * 按账号存储的 localStorage 键名列表
 */
const ACCOUNT_BASED_STORAGE_KEYS = [
  STORAGE_KEYS.AUTO_MESSAGE,
  STORAGE_KEYS.AUTO_REPLY,
  STORAGE_KEYS.AUTO_POPUP,
  STORAGE_KEYS.LIVE_CONTROL,
  STORAGE_KEYS.CHROME_CONFIG,
]

/**
 * 获取指定账号在指定存储键中的数据
 */
export function getAccountData<T>(storageKey: string, accountId: string): T | undefined {
  try {
    const data = localStorage.getItem(storageKey)
    if (!data) return undefined

    const parsed = JSON.parse(data)
    return parsed.state?.contexts?.[accountId] as T | undefined
  } catch {
    return undefined
  }
}

/**
 * 删除指定账号在指定存储键中的数据
 */
export function removeAccountData(storageKey: string, accountId: string): void {
  try {
    const data = localStorage.getItem(storageKey)
    if (!data) return

    const parsed = JSON.parse(data)
    if (parsed.state?.contexts?.[accountId]) {
      delete parsed.state.contexts[accountId]
      localStorage.setItem(storageKey, JSON.stringify(parsed))
    }
  } catch (error) {
    console.error(`Failed to remove account data for ${storageKey}:`, error)
  }
}

/**
 * 清理指定账号的所有 localStorage 数据
 * 包括所有按账号存储的配置
 */
export function clearAccountStorage(accountId: string): void {
  if (!accountId || accountId === 'default') return

  for (const key of ACCOUNT_BASED_STORAGE_KEYS) {
    removeAccountData(key, accountId)
  }
}

/**
 * 清理所有已废弃的 localStorage 键
 * 在版本迁移时调用
 * @returns 清理的废弃键数量
 */
export function clearDeprecatedStorage(): number {
  let count = 0
  for (const key of DEPRECATED_STORAGE_KEYS) {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      count++
    }
  }
  return count
}

/**
 * 清理孤立的账号数据（账号已被删除但数据仍存在）
 * 在版本迁移或手动清理时调用
 * @returns 清理的孤立数据数量
 */
export function cleanupOrphanedAccountData(): number {
  const validAccountIds = new Set(getExistingAccountIds())
  let totalCount = 0

  for (const storageKey of ACCOUNT_BASED_STORAGE_KEYS) {
    try {
      const data = localStorage.getItem(storageKey)
      if (!data) continue

      const parsed = JSON.parse(data)
      const contexts = parsed.state?.contexts || {}
      const contextKeys = Object.keys(contexts)

      let hasChanges = false
      let count = 0
      for (const accountId of contextKeys) {
        // 跳过默认账号
        if (accountId === 'default') continue

        // 如果账号不存在于账号列表中，删除其数据
        if (!validAccountIds.has(accountId)) {
          delete contexts[accountId]
          count++
          hasChanges = true
        }
      }

      if (hasChanges) {
        localStorage.setItem(storageKey, JSON.stringify(parsed))
        totalCount += count
      }
    } catch (error) {
      console.error(`[Storage] Failed to cleanup orphaned data for ${storageKey}:`, error)
    }
  }
  return totalCount
}

/**
 * 执行完整的存储清理
 * 包括清理废弃键和孤立数据
 * @returns 清理的总数据量
 */
export function performFullCleanup(): number {
  // 清理废弃的存储键
  const deprecatedCount = clearDeprecatedStorage()
  // 清理孤立的账号数据
  const orphanedCount = cleanupOrphanedAccountData()
  // 更新存储版本
  localStorage.setItem(STORAGE_VERSION_KEY, APP_VERSION)
  const totalCount = deprecatedCount + orphanedCount
  return totalCount
}

/**
 * 获取账号列表
 */
function getExistingAccountIds(): string[] {
  try {
    const accountsData = localStorage.getItem(STORAGE_KEYS.ACCOUNTS)
    if (!accountsData) return []

    const parsed = JSON.parse(accountsData)
    const accounts = parsed.state?.accounts || []
    return accounts.map((acc: { id: string }) => acc.id)
  } catch {
    return []
  }
}

/**
 * 获取所有 localStorage 键名（用于调试）
 */
export function getAllStorageKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) keys.push(key)
  }
  return keys
}

/**
 * 启动程序时自动判断是否需要执行版本迁移清理
 */
export function autoCleanupStorage(): void {
  // 检查是否需要执行版本迁移清理
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
  if (storedVersion !== APP_VERSION) {
    performFullCleanup()
  }
}
