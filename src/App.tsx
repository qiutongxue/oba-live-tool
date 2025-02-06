import LogDisplayer from '@/components/LogDisplayer'
import Sidebar from '@/components/Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Header } from './components/Header'
import { useLiveControl } from './hooks/useLiveControl'
import './App.css'

function App() {
  const { setIsConnected } = useLiveControl()
  useEffect(() => {
    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.tasks.liveControl.disconnect, () => {
      setIsConnected(false)
    })
    return () => removeListener()
  }, [setIsConnected])

  return (
    <>

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
      <Toaster />
    </>
  )
}

export default App
