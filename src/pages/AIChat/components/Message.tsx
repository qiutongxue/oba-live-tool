import { RotateCw } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ChatMessage } from '@/hooks/useAIChat'
import { useAIChatStore } from '@/hooks/useAIChat'
import { MessageContent } from './MessageContent'

export function Message({
  id,
  role,
  content,
  reasoning_content,
  timestamp,
  isError,
  onRetry,
}: ChatMessage & {
  onRetry: (messages: { role: string; content: string; reasoning_content?: string }[]) => void
}) {
  const { messages, setMessages } = useAIChatStore()

  // 判断是否显示重试按钮
  const showRetry = useMemo(() => {
    if (role !== 'user') return false
    const index = messages.findIndex(m => m.id === id)
    const nextMessage = messages[index + 1]
    return nextMessage?.isError ?? false
  }, [messages, id, role])

  const handleRetry = useCallback(async () => {
    // 找到当前消息后的错误消息并移除
    const currentIndex = messages.findIndex(m => m.id === id)
    if (currentIndex === -1) return
    // 移除错误消息
    const newMessages = [...messages]
    newMessages.splice(currentIndex + 1, 1)
    setMessages(newMessages)
    onRetry(newMessages.map(m => ({ role: m.role, content: m.content })))
  }, [messages, id, onRetry, setMessages])

  return role === 'user' ? (
    <UserMessage
      content={content}
      timestamp={timestamp}
      showRetry={showRetry}
      handleRetry={handleRetry}
    />
  ) : (
    <AssistantMessage
      content={content}
      reasoning_content={reasoning_content}
      timestamp={timestamp}
      isError={isError ?? false}
    />
  )
}

function UserMessage({
  content,
  timestamp,
  showRetry,
  handleRetry,
}: {
  content: string
  timestamp: number
  showRetry: boolean
  handleRetry: () => void
}) {
  return (
    <div className="relative flex justify-end group">
      {showRetry && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRetry}
          className="opacity-50 group-hover:opacity-100 transition-opacity hover:bg-transparent"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      )}
      <div
        className="max-w-[80%] rounded-lg px-4 py-2 break-words shadow-sm bg-primary text-primary-foreground"
        style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
      >
        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</div>
        <div className="absolute -bottom-5 select-none right-1">
          <span className="text-[11px] text-primary/70">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}

function AssistantMessage({
  content,
  reasoning_content,
  timestamp,
  isError,
}: {
  content: string
  reasoning_content: string | undefined
  timestamp: number
  isError: boolean
}) {
  return (
    <div className="relative flex justify-start group">
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 break-words shadow-sm ${
          isError ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-muted/80'
        }`}
        style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
      >
        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
          {reasoning_content && (
            <p className="text-muted-foreground text-[13px]">{reasoning_content}</p>
          )}
          {reasoning_content && content && <Separator className="my-2" />}
          <MessageContent content={content} />
        </div>
        <div className="absolute -bottom-5 select-none  left-1">
          <span className="text-[11px] text-muted-foreground/70">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}
