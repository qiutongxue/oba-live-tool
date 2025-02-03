import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import { Message } from '@/components/ai-chat/Message'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useAIChatStore } from '@/hooks/useAIChat'
import { useToast } from '@/hooks/useToast'
import { messagesToContext } from '@/lib/utils'
import { PaperPlaneIcon, TrashIcon } from '@radix-ui/react-icons'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function AIChat() {
  const { messages, addMessage, isLoading, setLoading, clearMessages, provider, apiKeys } = useAIChatStore()
  const [input, setInput] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = useCallback(() => {
    if (viewportRef.current) {
      const scrollContainer = viewportRef.current
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport instanceof HTMLDivElement) {
        (viewportRef as { current: HTMLDivElement }).current = viewport
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const trySendMessage = async (messages: { role: string, content: string }[]) => {
    try {
      setLoading(true)
      const response = await window.ipcRenderer.invoke('ai-chat', {
        messages,
        apiKey: apiKeys[provider],
        provider,
      })
      if (response.success) {
        addMessage({ role: 'assistant', content: response.message })
      }
      else {
        addMessage({ role: 'assistant', content: response.error, isError: true })
      }
    }
    catch {
      toast.error('发送消息失败')
    }
    finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!apiKeys[provider]) {
      toast.error('请先配置 API Key')
      return
    }
    if (!input.trim() || isLoading)
      return

    const userMessage = input.trim()
    setInput('')
    addMessage({ role: 'user', content: userMessage })

    await trySendMessage(messagesToContext(messages, userMessage))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI 助手</h1>
          <p className="text-muted-foreground mt-2">
            与 AI 助手进行对话，获取帮助。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <APIKeyDialog />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={messages.length === 0}
            className="text-muted-foreground hover:text-destructive"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            清空对话
          </Button>
        </div>
      </div>

      <Card className="flex flex-col h-[calc(100vh-20rem)] border-none">
        <CardContent className="flex-1 flex flex-col gap-4 p-0 overflow-hidden">
          <ScrollArea
            ref={scrollAreaRef}
            className="flex-1 px-6 py-4"
          >
            <div className="space-y-6 min-h-[100px]">
              {messages.map(message => (
                <Message key={message.id} {...message} onRetry={trySendMessage} />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 items-stretch p-4 border-t">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，按 Enter 发送..."
              className="resize-none flex-1 min-h-[56px] max-h-[200px] bg-muted/50 focus:bg-background transition-colors"
              rows={3}
            />
            <Button
              size="icon"
              className="px-8 h-auto bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              <PaperPlaneIcon className="h-5 w-5" />
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
