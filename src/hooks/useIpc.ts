import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { useAccounts } from './useAccounts'
import { useAutoMessageStore } from './useAutoMessage'
import { useAutoPopUpStore } from './useAutoPopUp'
import { type Comment, useAutoReply } from './useAutoReply'
import { useLiveControlStore } from './useLiveControl'
import { useToast } from './useToast'
// 需要全局监听的 ipc 事件

export function useIpc() {
  const { handleComment } = useAutoReply()
  const { setIsConnected } = useLiveControlStore()
  const { setIsRunning: setIsRunningAutoMessage } = useAutoMessageStore()
  const { setIsRunning: setIsRunningAutoPopUp } = useAutoPopUpStore()
  const { accounts, currentAccountId } = useAccounts()
  const { toast } = useToast()

  useEffect(() => {
    window.ipcRenderer.invoke(
      IPC_CHANNELS.account.switch,
      { accountId: currentAccountId, accountNames: accounts },
    )
  }, [accounts, currentAccountId])

  useEffect(() => {
    const removeListeners: (() => void)[] = [
      window.ipcRenderer.on(
        IPC_CHANNELS.tasks.autoReply.showComment,
        ({ comment, accountId }: { comment: Comment, accountId: string }) => {
          handleComment(comment, accountId)
        },
      ),
      window.ipcRenderer.on(
        IPC_CHANNELS.tasks.liveControl.disconnect,
        (id: string) => {
          setIsConnected(id, 'disconnected')
          toast.error('直播控制台已断开连接')
        },
      ),
      window.ipcRenderer.on(IPC_CHANNELS.tasks.autoMessage.stop, (id: string) => {
        setIsRunningAutoMessage(id, false)
        toast.error('自动发言已停止')
      }),
      window.ipcRenderer.on(IPC_CHANNELS.tasks.autoPopUp.stop, (id: string) => {
        setIsRunningAutoPopUp(id, false)
        toast.error('自动弹窗已停止')
      }),
    ]

    return () => {
      removeListeners.forEach(removeListener => removeListener())
    }
  }, [setIsConnected, setIsRunningAutoMessage, setIsRunningAutoPopUp, toast, handleComment])
}
