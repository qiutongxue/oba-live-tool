import LogDisplayer from '@/components/LogDisplayer'
import Sidebar from '@/components/Sidebar'
import { ToastContainer } from '@/components/ToastContainer'
import { LiveControlProvider } from '@/providers/LiveControlProvider'
import { Outlet } from 'react-router'
import './App.css'

function App() {
  return (
    <LiveControlProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* 头部标题 */}
        <header className="h-16 bg-white shadow-sm flex items-center px-8 relative z-10">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-800">直播助手</h1>
          </div>
        </header>

        {/* 主要内容区域 */}
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <div className="flex-1 p-8 overflow-auto">
            <Outlet />
          </div>
        </div>

        {/* 下半部分：日志显示器 */}
        <div className="h-[180px] bg-white border-t shadow-inner">
          <LogDisplayer />
        </div>
      </div>
      <ToastContainer />
    </LiveControlProvider>
  )
}

export default App
