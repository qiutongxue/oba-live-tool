import React, { useState } from 'react'
import LogDisplayer from './components/LogDisplayer'
import Sidebar from './components/Sidebar'
import TaskConfig from './components/TaskConfig'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('autoMessage')

  return (
    <div className="flex flex-col h-screen">
      {/* 上半部分：侧边栏和配置页 */}
      <div className="flex flex-1 min-h-0">
        {/* 侧边栏 */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* 配置页 */}
        <div className="flex-1 p-8 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">直播助手</h1>
          <TaskConfig activeTab={activeTab} />
        </div>
      </div>

      {/* 下半部分：日志显示器 */}
      <div className="h-[200px] border-t">
        <LogDisplayer />
      </div>
    </div>
  )
}

export default App
