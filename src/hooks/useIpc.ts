import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { type Comment, useAutoReplyStore } from './useAutoReply'

// 需要全局监听的 ipc 事件

export function useIpc() {
  const { addComment } = useAutoReplyStore()

  useEffect(() => {
    console.warn('useIpc')
    const removeListeners: (() => void)[] = []

    removeListeners.push(
      window.ipcRenderer.on(
        IPC_CHANNELS.tasks.autoReply.showComment,
        (comment: Comment) => {
          addComment(comment)
        },

      ),
    )

    return () => {
      removeListeners.forEach(removeListener => removeListener())
    }
  }, [addComment])
}
