import LogDisplayer from '@/components/common/LogDisplayer'
import Sidebar from '@/components/common/Sidebar'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Toaster } from '@/components/ui/toaster'
import { useDevMode } from '@/hooks/useDevMode'
import { RefreshCwIcon, TerminalIcon } from 'lucide-react'
import { Outlet } from 'react-router'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Header } from './components/common/Header'
import { useIpcListener } from './hooks/useIpc'
import './App.css'
import { useEffect } from 'react'
import { useAccounts } from './hooks/useAccounts'
import { useAutoMessageStore } from './hooks/useAutoMessage'
import { useAutoPopUpStore } from './hooks/useAutoPopUp'
import { useAutoReply } from './hooks/useAutoReply'
import { useLiveControlStore } from './hooks/useLiveControl'
import { useToast } from './hooks/useToast'

function useGlobalIpcListener() {
  const { handleComment } = useAutoReply()
  const { setIsConnected } = useLiveControlStore()
  const { setIsRunning: setIsRunningAutoMessage } = useAutoMessageStore()
  const { setIsRunning: setIsRunningAutoPopUp } = useAutoPopUpStore()
  const { toast } = useToast()

  useIpcListener(
    IPC_CHANNELS.tasks.autoReply.showComment,
    ({ comment, accountId }) => {
      handleComment(comment, accountId)
    },
  )

  useIpcListener(IPC_CHANNELS.tasks.liveControl.disconnectedEvent, id => {
    setIsConnected(id, 'disconnected')
    toast.error('直播控制台已断开连接')
  })

  useIpcListener(IPC_CHANNELS.tasks.autoMessage.stoppedEvent, id => {
    setIsRunningAutoMessage(id, false)
    toast.error('自动发言已停止')
  })

  useIpcListener(IPC_CHANNELS.tasks.autoPopUp.stoppedEvent, id => {
    setIsRunningAutoPopUp(id, false)
    toast.error('自动弹窗已停止')
  })
}

function App() {
  const { enabled: devMode } = useDevMode()
  const { accounts, currentAccountId } = useAccounts()

  useEffect(() => {
    window.ipcRenderer.invoke(IPC_CHANNELS.account.switch, {
      accountId: currentAccountId,
      accountNames: accounts,
    })
  }, [accounts, currentAccountId])

  useGlobalIpcListener()

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleToggleDevTools = async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.chrome.toggleDevTools)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger disabled={!devMode} className="min-h-screen">
          <div className="flex flex-col h-screen bg-gray-50">
            {/* 头部标题 */}
            <Header />

            {/* 主体内容 */}
            <div className="flex-1 flex overflow-hidden">
              {/* 侧边栏 */}
              <Sidebar />

              {/* 主要内容区域 */}
              <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
              </main>
            </div>

            {/* 下半部分：日志显示器 */}
            <div className="h-[180px] bg-white border-t shadow-inner">
              <LogDisplayer />
            </div>
          </div>
        </ContextMenuTrigger>
        {devMode && (
          <ContextMenuContent>
            <ContextMenuItem onClick={handleRefresh}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              <span>刷新页面</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleToggleDevTools}>
              <TerminalIcon className="mr-2 h-4 w-4" />
              <span>开发者工具</span>
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
      <Toaster />
    </>
  )
}

export default App
