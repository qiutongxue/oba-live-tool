import { useToast } from '@/hooks/useToast'
import { useCallback, useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

export interface Comment {
  nickname: string
  authorTags: string[]
  commentTags: string[]
  content: string
  timestamp: string
}

export function useAutoReply() {
  const [isRunning, setIsRunning] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const { toast } = useToast()

  // 监听新评论
  useEffect(() => {
    const removeListener = window.ipcRenderer.on(
      IPC_CHANNELS.tasks.autoReply.showComment,
      (comment: Comment) => {
        setComments(prev => [comment, ...prev].slice(0, 100)) // 最多保留100条评论
      },
    )

    return () => removeListener()
  }, [])

  // 开始监听
  const startAutoReply = useCallback(async () => {
    try {
      await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoReply.start)
      setIsRunning(true)
      toast.success('自动回复已启动')
    }
    catch {
      toast.error('启动自动回复失败')
    }
  }, [toast])

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
  }, [toast])

  // 清空评论列表
  const clearComments = useCallback(() => {
    setComments([])
  }, [])

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
    comments,
    startAutoReply,
    stopAutoReply,
    clearComments,
    formatTime,
  }
}
