import { useLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import React, { useState } from 'react'

export default function BrowserControl() {
  const { isConnected, setIsConnected } = useLiveControl()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const connectLiveControl = async () => {
    try {
      setIsLoading(true)
      const { success } = await window.ipcRenderer.invoke(window.ipcChannels.tasks.liveControl.connect)
      if (success) {
        setIsConnected(true)
        toast.success('已连接到直播控制台')
      }
      else {
        toast.error('连接直播控制台失败')
      }
    }
    catch {
      toast.error('连接直播控制台失败')
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 状态卡片 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">直播控制台状态</h2>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium text-gray-600">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
            <button
              type="button"
              onClick={connectLiveControl}
              disabled={isLoading || isConnected}
              className={`px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                isConnected
                  ? 'bg-green-50 text-green-600 cursor-not-allowed'
                  : isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isConnected
                  ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    )
                  : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    )}
              </svg>
              {isConnected ? '已连接' : isLoading ? '连接中...' : '连接直播控制台'}
            </button>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">使用说明</h2>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-blue-600">1</span>
              </div>
              <p className="text-gray-600 leading-6">
                点击"连接直播控制台"按钮，等待登录抖音小店
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-blue-600">2</span>
              </div>
              <p className="text-gray-600 leading-6">
                登录成功后，即可使用自动发言和自动弹窗功能
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
