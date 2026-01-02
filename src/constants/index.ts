/**
 * 全局常量定义
 */

// 自动回复相关常量
export const AUTO_REPLY = {
  /** 最大评论数限制 */
  MAX_COMMENTS: 500,
  /** 最大回复数限制 */
  MAX_REPLIES: 500,
  /** 用户名占位符 */
  USERNAME_PLACEHOLDER: '{用户名}',
} as const

// Toast 提示相关常量
export const TOAST = {
  /** 同时显示的最大 toast 数量 */
  LIMIT: 1,
  /** toast 自动移除的延迟时间（毫秒） */
  REMOVE_DELAY: 3000,
} as const

// 响应式断点常量
export const BREAKPOINTS = {
  /** 移动端断点（像素） */
  MOBILE: 768,
} as const
