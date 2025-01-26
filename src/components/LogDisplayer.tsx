import React, { useEffect, useMemo, useRef, useState } from 'react'

interface ParsedLog {
  timestamp: string
  module: string
  level: string
  message: string
}

export default function LogDisplayer() {
  const [logMessages, setLogMessages] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (scrollRef.current && autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const parseLogMessage = (log: string): ParsedLog => {
    // 匹配格式：[时间] [模块] » 级别 消息
    const match = log.match(/\[(.*?)\] \[(.*?)\] » (\w+)\s+(.*)/)
    if (!match)
      return { timestamp: '', module: '', level: '', message: log }
    return {
      timestamp: match[1],
      module: match[2],
      level: match[3],
      message: match[4],
    }
  }

  const getLevelColor = (level: string): string => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-red-600'
      case 'FATAL': return 'text-red-800'
      case 'WARN': return 'text-amber-600'
      case 'DEBUG': return 'text-blue-600'
      case 'INFO': return 'text-slate-600'
      case 'SUCCESS': return 'text-emerald-600'
      case 'NOTE': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  useEffect(() => {
    const handleLogMessage = (_event: any, message: string) => {
      setLogMessages(prev => [...prev, message])
      setTimeout(scrollToBottom, 0)
    }
    window.ipcRenderer.on('log', handleLogMessage)
    return () => {
      window.ipcRenderer.off('log', handleLogMessage)
    }
  }, [autoScroll])

  return (
    <div className="h-full flex flex-col">
      {/* 日志头部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">运行日志</span>
          <span className="text-xs text-gray-500">
            {logMessages.length}
            {' '}
            条记录
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* 自动滚动开关 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="text-xs text-gray-600">自动滚动</span>
          </label>
          <button
            onClick={() => {
              setLogMessages([])
              scrollToBottom()
            }}
            className="px-2 py-1 text-xs text-gray-600 hover:text-red-600 rounded"
          >
            清空
          </button>
        </div>
      </div>

      {/* 日志内容 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-sm"
      >
        <div className="px-4">
          {useMemo(() =>
            logMessages.map((log, index) => {
              const parsed = parseLogMessage(log)
              return (
                <div key={index} className="flex gap-2 items-start py-1 whitespace-nowrap">
                  <span className="text-gray-500 shrink-0">
                    [
                    {parsed.timestamp}
                    ]
                  </span>
                  <span className="text-gray-700 shrink-0">
                    [
                    {parsed.module}
                    ]
                  </span>
                  <span className={`font-semibold shrink-0 ${getLevelColor(parsed.level)}`}>
                    {parsed.level}
                  </span>
                  <span className="text-gray-800 truncate">
                    {parsed.message}
                  </span>
                </div>
              )
            }), [logMessages])}
        </div>
      </div>
    </div>
  )
}
