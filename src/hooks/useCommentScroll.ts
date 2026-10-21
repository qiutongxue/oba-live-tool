import { useCallback } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

/**
 * 「评论列表自动滚动」的运行状态（按账号分开）。
 *
 * 只放在内存里、不持久化：任务本身活在主进程里，App 重启后任务并不存在，
 * 如果把 isRunning 持久化成 true，界面就会显示一个"假运行中"的开关。
 */
interface CommentScrollContext {
  isRunning: boolean
}

const DEFAULT_CONTEXT: CommentScrollContext = { isRunning: false }

/** 默认滚动间隔（毫秒区间），与主进程 CommentScrollTask 的默认值保持一致 */
const DEFAULT_INTERVAL: [number, number] = [2500, 4000]

interface CommentScrollStore {
  contexts: Record<string, CommentScrollContext>
  setRunning: (accountId: string, running: boolean) => void
}

export const useCommentScrollStore = create<CommentScrollStore>()(set => {
  eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
    set(state => {
      const { [accountId]: _removed, ...rest } = state.contexts
      return { contexts: rest }
    })
  })

  return {
    contexts: {},
    setRunning: (accountId, running) =>
      set(state => ({
        contexts: {
          ...state.contexts,
          [accountId]: { ...(state.contexts[accountId] ?? DEFAULT_CONTEXT), isRunning: running },
        },
      })),
  }
})

/** 读取当前账号的运行状态 */
export const useCurrentCommentScroll = <T>(getter: (context: CommentScrollContext) => T): T => {
  const accountId = useAccounts(state => state.currentAccountId)
  return useCommentScrollStore(
    useShallow(state => getter(state.contexts[accountId] ?? DEFAULT_CONTEXT)),
  )
}

/** 组件侧动作：启动 / 停止，带 toast 提示 */
export function useCommentScrollActions() {
  const accountId = useAccounts(state => state.currentAccountId)
  const setRunning = useCommentScrollStore(state => state.setRunning)
  const { toast } = useToast()

  const start = useCallback(async () => {
    try {
      const ok = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.commentScroll.start,
        accountId,
        {
          interval: DEFAULT_INTERVAL,
        },
      )
      setRunning(accountId, Boolean(ok))
      if (ok) toast.success('已开启评论列表自动滚动')
      else toast.error('开启失败，请确认已连接中控台并查看底部日志')
      return Boolean(ok)
    } catch {
      setRunning(accountId, false)
      toast.error('开启评论列表自动滚动出错')
      return false
    }
  }, [accountId, setRunning, toast])

  const stop = useCallback(async () => {
    try {
      await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.commentScroll.stop, accountId)
      setRunning(accountId, false)
      toast.success('已停止评论列表自动滚动')
    } catch {
      toast.error('停止评论列表自动滚动出错')
    }
  }, [accountId, setRunning, toast])

  return { start, stop, setRunning }
}
