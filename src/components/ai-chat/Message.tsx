import type { ChatMessage } from '@/hooks/useAIChat'
import { useAIChatStore } from '@/hooks/useAIChat'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useCallback } from 'react'
import { Button } from '../ui/button'

export function Message({
  id,
  role,
  content,
  timestamp,
  isError,
  onRetry,
}: ChatMessage & { onRetry: (messages: { role: string, content: string }[]) => void }) {
  const { messages, setMessages } = useAIChatStore()

  // 判断是否显示重试按钮
  const showRetry = role === 'user' && (() => {
    const index = messages.findIndex(m => m.id === id)
    const nextMessage = messages[index + 1]
    return nextMessage?.isError
  })()

  const handleRetry = useCallback(async () => {
    // 找到当前消息后的错误消息并移除
    const currentIndex = messages.findIndex(m => m.id === id)
    if (currentIndex === -1)
      return
    // 移除错误消息
    const newMessages = [...messages]
    newMessages.splice(currentIndex + 1, 1)
    setMessages(newMessages)
    onRetry(newMessages.map(m => ({ role: m.role, content: m.content })))
  }, [messages, id, onRetry, setMessages])

  return (
    <div
      className={`relative flex ${role === 'user' ? 'justify-end' : 'justify-start'} group`}
    >
      {showRetry && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRetry}
          className="opacity-50 group-hover:opacity-100 transition-opacity hover:bg-transparent"
        >
          <ReloadIcon className="h-4 w-4" />
        </Button>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 break-words shadow-sm ${
          role === 'user'
            ? 'bg-primary text-primary-foreground'
            : isError
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-muted hover:bg-muted/80'
        }`}
        style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
      >
        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
          {content}
        </p>
        <div className={`absolute -bottom-5 select-none ${
          role === 'user'
            ? 'right-1'
            : 'left-1'
        }`}
        >
          <span className={`text-[11px] ${
            role === 'user'
              ? 'text-primary/70'
              : 'text-muted-foreground/70'
          }`}
          >
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}
