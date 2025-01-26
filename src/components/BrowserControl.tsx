import React, { useState } from 'react'
import { useLiveControl } from '../contexts/LiveControlContext'
import Toast from './Toast'

export default function BrowserControl() {
  const { isConnected, setIsConnected } = useLiveControl()
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const connectLiveControl = async () => {
    try {
      setIsLoading(true)
      const { success } = await window.ipcRenderer.invoke('connect-live-control')
      if (success) {
        setIsConnected(true)
        setToast({ message: '已连接到直播控制台', type: 'success' })
      }
      else {
        setToast({ message: '连接直播控制台失败', type: 'error' })
      }
    }
    catch {
      setToast({ message: '连接直播控制台失败', type: 'error' })
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">浏览器控制</h2>
        <button
          onClick={connectLiveControl}
          disabled={isLoading || isConnected}
          className={`px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
            isConnected
              ? 'bg-green-500 text-white cursor-not-allowed'
              : isLoading
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          {isConnected ? '已连接' : '连接直播控制台'}
        </button>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
