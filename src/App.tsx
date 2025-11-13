import { RefreshCwIcon, TerminalIcon } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router'
import { IPC_CHANNELS } from 'shared/ipcChannels'
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
import { Header } from './components/common/Header'
import { useIpcListener } from './hooks/useIpc'
import './App.css'
import { useEffect, useState } from 'react'
import { HtmlRenderer } from './components/common/HtmlRenderer'
import { Button } from './components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './components/ui/dialog'
import { ScrollArea } from './components/ui/scroll-area'
import { useAccounts } from './hooks/useAccounts'
import { useAutoMessageStore } from './hooks/useAutoMessage'
import { useAutoPopUpStore } from './hooks/useAutoPopUp'
import { useAutoReply, useAutoReplyStore } from './hooks/useAutoReply'
import { useChromeConfigStore } from './hooks/useChromeConfig'
import { useLiveControlStore } from './hooks/useLiveControl'
import { useToast } from './hooks/useToast'
import { useUpdateStore } from './hooks/useUpdate'

function useGlobalIpcListener() {
  const { handleComment } = useAutoReply()
  const { setIsListening } = useAutoReplyStore()
  const { setIsConnected } = useLiveControlStore()
  const { setIsRunning: setIsRunningAutoMessage } = useAutoMessageStore()
  const { setIsRunning: setIsRunningAutoPopUp } = useAutoPopUpStore()
  const { setStorageState } = useChromeConfigStore()
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

  useIpcListener(IPC_CHANNELS.tasks.autoReply.listenerStopped, id => {
    setIsListening(id, 'stopped')
  })

  useIpcListener(IPC_CHANNELS.chrome.saveState, (id, state) => {
    setStorageState(id, state)
  })
}

function UpdateInfo() {
  const [isUpdateAlertShow, setIsUpdateAlertShow] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string
    latestVersion: string
    releaseNote?: string
  } | null>(null)
  const updateStore = useUpdateStore()

  const navigate = useNavigate()

  useIpcListener(IPC_CHANNELS.app.notifyUpdate, info => {
    if (updateStore.enableAutoCheckUpdate) {
      setIsUpdateAlertShow(true)
      setUpdateInfo(info)
    }
  })

  const handleUpdateNow = () => {
    setIsUpdateAlertShow(false)
    navigate('/settings#update-section')
  }

  return (
    <Dialog open={isUpdateAlertShow} onOpenChange={setIsUpdateAlertShow}>
      <DialogContent>
        <DialogTitle>有新版本可用</DialogTitle>
        <DialogDescription>现在更新以体验最新功能。</DialogDescription>

        <div className="flex justify-end space-x-1 items-center text-sm text-muted-foreground">
          <span className="text-gray-400">v{updateInfo?.currentVersion}</span>
          <span>{'→'}</span>
          <span className="text-gray-700 font-bold">
            v{updateInfo?.latestVersion}
          </span>
        </div>
        {updateInfo?.releaseNote && (
          <ScrollArea className="h-64">
            <HtmlRenderer
              className="markdown-body"
              html={updateInfo?.releaseNote}
            />{' '}
          </ScrollArea>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsUpdateAlertShow(false)}>
            关闭
          </Button>
          <Button variant="default" onClick={handleUpdateNow}>
            前往更新
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function App() {
  const { enabled: devMode } = useDevMode()
  const { accounts, currentAccountId } = useAccounts()

  useEffect(() => {
    const account = accounts.find(acc => acc.id === currentAccountId)
    if (account) {
      window.ipcRenderer.invoke(IPC_CHANNELS.account.switch, { account })
    }
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
          <UpdateInfo />
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
