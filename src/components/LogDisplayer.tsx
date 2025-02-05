import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface ParsedLog {
  id: string
  timestamp: string
  module: string
  level: string
  message: string
}

const MAX_LOG_MESSAGES = 200 // 仅展示最近的 200 条日志

export default function LogDisplayer() {
  const [logMessages, setLogMessages] = useState<ParsedLog[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (viewportRef.current && autoScroll) {
      const scrollContainer = viewportRef.current
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [autoScroll])

  const parseLogMessage = (log: string): ParsedLog | null => {
    // 匹配格式：[时间] [模块] » 级别 消息
    const match = log.match(/\[(.*?)\] \[(.*?)\] » (\w+)\s+(.*)/)
    if (!match)
      return null
    return {
      id: crypto.randomUUID(),
      timestamp: match[1],
      module: match[2],
      level: match[3],
      message: match[4],
    }
  }

  const getLevelColor = (level: string): string => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-destructive font-medium'
      case 'FATAL': return 'text-destructive font-bold'
      case 'WARN': return 'text-warning font-medium'
      case 'DEBUG': return 'text-blue-600'
      case 'INFO': return 'text-muted-foreground'
      case 'SUCCESS': return 'text-emerald-600'
      case 'NOTE': return 'text-purple-600'
      default: return 'text-muted-foreground'
    }
  }

  useEffect(() => {
    // 监听 ScrollArea 的 viewport 元素
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport instanceof HTMLDivElement) {
        // 使用 MutableRefObject 来避免只读属性错误
        (viewportRef as { current: HTMLDivElement | null }).current = viewport
      }
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    const handleLogMessage = (message: string) => {
      const parsed = parseLogMessage(message)
      if (parsed)
        setLogMessages(prev => [...prev.slice(-MAX_LOG_MESSAGES), parsed])
      if (autoScroll) {
        // 使用 requestAnimationFrame 来确保在下一帧执行滚动
        timer = setTimeout(() => {
          requestAnimationFrame(scrollToBottom)
        }, 0)
      }
    }

    const removeListener = window.ipcRenderer.on('log', handleLogMessage)

    return () => {
      removeListener()
      timer && clearTimeout(timer)
    }
  }, [autoScroll, scrollToBottom])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 日志头部 */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">运行日志</h3>
          <span className="text-xs text-muted-foreground">
            {logMessages.length}
            {' '}
            条记录
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* 自动滚动开关 */}
          <div className="flex items-center gap-2">
            <Switch
              id="auto-scroll"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
            />
            <label
              htmlFor="auto-scroll"
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              自动滚动
            </label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLogMessages([])
              scrollToBottom()
            }}
            className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
          >
            清空
          </Button>
        </div>
      </div>

      {/* 日志内容 */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1"
      >
        <div className="p-4 font-mono text-sm">
          {useMemo(() =>
            logMessages.map((log, index) => {
              return (
                <div
                  key={log.id}
                  className={cn(
                    'flex gap-2 items-start py-1 whitespace-nowrap',
                    index % 2 === 0 ? 'bg-muted/40' : 'bg-background',
                  )}
                >
                  <span className="text-muted-foreground shrink-0">
                    [
                    {log.timestamp}
                    ]
                    v
                  </span>
                  <span className="text-foreground/70 shrink-0">
                    [
                    {log.module}
                    ]
                  </span>
                  <span className={cn('shrink-0', getLevelColor(log.level))}>
                    {log.level}
                  </span>
                  <span className="text-foreground truncate">
                    {log.message}
                  </span>
                </div>
              )
            }), [logMessages])}
        </div>
      </ScrollArea>
    </div>
  )
}
