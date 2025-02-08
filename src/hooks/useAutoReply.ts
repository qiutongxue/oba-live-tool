import { useToast } from '@/hooks/useToast'
import { useCallback } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'

export interface Comment {
  id?: string
  nickname: string
  authorTags: string[]
  commentTags: string[]
  content: string
  timestamp: string
}

interface AutoReplyStore {
  isRunning: boolean
  comments: Comment[]
  setIsRunning: (running: boolean) => void
  addComment: (comment: Comment) => void
  clearComments: () => void
}

export const useAutoReplyStore = create<AutoReplyStore>(set => ({
  isRunning: false,
  comments: [],
  setIsRunning: running => set({ isRunning: running }),
  addComment: comment => set(state => ({
    comments: [{ ...comment, id: crypto.randomUUID() }, ...state.comments],
  })),
  clearComments: () => set({ comments: [] }),

}))

export function useAutoReply() {
  const { toast } = useToast()
  const {
    isRunning,
    comments,
    setIsRunning,
    clearComments,
  } = useAutoReplyStore()

  // 开始监听
  const startAutoReply = useCallback(async () => {
    try {
      const result = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReply.start,
      )
      if (!result)
        throw new Error('启动自动回复失败')
      setIsRunning(true)
      toast.success('自动回复已启动')
    }
    catch {
      toast.error('启动自动回复失败')
    }
  }, [toast, setIsRunning])

  // 停止监听
  const stopAutoReply = useCallback(async () => {
    try {
      await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoReply.stop)
      setIsRunning(false)
      toast.success('自动回复已停止')
    }
    catch {
      toast.error('停止自动回复失败')
    }
  }, [toast, setIsRunning])

  // 格式化时间
  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }, [])

  return {
    isRunning,
    setIsRunning,
    comments,
    startAutoReply,
    stopAutoReply,
    clearComments,
    formatTime,
  }
}
