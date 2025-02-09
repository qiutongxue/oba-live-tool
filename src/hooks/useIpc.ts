import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { type Comment, useAutoReplyStore } from './useAutoReply'
import { useLiveControlStore } from './useLiveControl'
import { useToast } from './useToast'

// 需要全局监听的 ipc 事件

export function useIpc() {
  const { addComment } = useAutoReplyStore()
  const { setIsConnected } = useLiveControlStore()
  const { toast } = useToast()
  useEffect(() => {
    const removeListeners: (() => void)[] = [
      window.ipcRenderer.on(
        IPC_CHANNELS.tasks.autoReply.showComment,
        (comment: Comment) => {
          addComment(comment)
        },
      ),
      window.ipcRenderer.on(
        IPC_CHANNELS.tasks.liveControl.disconnect,
        () => {
          setIsConnected(false)
          toast.error('直播控制台已断开连接')
        },
      ),
    ]

    return () => {
      removeListeners.forEach(removeListener => removeListener())
    }
  }, [addComment, setIsConnected, toast])
}
