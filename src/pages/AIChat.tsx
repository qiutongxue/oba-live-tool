import AIModelInfo from '@/components/ai-chat/AIModelInfo'
import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import { Message } from '@/components/ai-chat/Message'
import { LoadingIcon } from '@/components/icons/loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useAIChatStore } from '@/hooks/useAIChat'
import { useToast } from '@/hooks/useToast'
import { messagesToContext } from '@/lib/utils'
import { PaperPlaneIcon, TrashIcon } from '@radix-ui/react-icons'
import { useDebounceEffect } from 'ahooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { providers } from 'shared/providers'

export default function AIChat() {
  const {
    messages,
    addMessage,
    status,
    setStatus,
    appendToChat,
    tryToHandleEmptyMessage,
    appendToReasoning,
    clearMessages,
    config,
    apiKeys,
  } = useAIChatStore()
  const [input, setInput] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useDebounceEffect(
    () => {
      if (viewportRef.current) {
        const scrollContainer = viewportRef.current
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    },
    [messages],
    { wait: 100 },
  )

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]',
      )
      if (viewport instanceof HTMLDivElement) {
        ;(viewportRef as { current: HTMLDivElement }).current = viewport
      }
    }
  }, [])

  const trySendMessage = async (
    messages: { role: string; content: string }[],
  ) => {
    return new Promise((resolve, reject) => {
      setStatus('waiting')
      const removeStreamListener = window.ipcRenderer.on(
        IPC_CHANNELS.tasks.aiChat.stream,
        streamListener,
      )
      const removeErrorHandler = window.ipcRenderer.on(
        IPC_CHANNELS.tasks.aiChat.error,
        errorHandler,
      )

      const cleanup = () => {
        removeStreamListener()
        removeErrorHandler()
      }

      // 设置流数据监听
      function streamListener({
        chunk,
        done,
        type,
      }: { chunk: string; done: boolean; type: string }) {
        if (done) {
          cleanup()
          resolve(true)
        } else if (chunk) {
          setStatus('replying')
          // 更新 UI 的逻辑
          if (type === 'content') {
            appendToChat(chunk)
          } else if (type === 'reasoning') {
            appendToReasoning(chunk)
          }
        }
      }

      // 设置错误监听
      function errorHandler({ error }: { error: string }) {
        cleanup()
        reject(error)
      }

      // 注册监听器

      // 清理函数

      // 发送请求
      window.ipcRenderer
        .invoke(IPC_CHANNELS.tasks.aiChat.chat, {
          messages,
          apiKey: apiKeys[config.provider],
          provider: config.provider,
          model: config.model,
        })
        .catch(error => {
          cleanup()
          reject(error)
        })
    })
      .catch(error => {
        addMessage({ role: 'assistant', content: error, isError: true })
      })
      .finally(() => {
        // 使用 openai 的流式请求 OpenRouter 可能会传回空数据
        // 如果是数据，需要手动设置一个消息
        tryToHandleEmptyMessage(
          '可能是网络请求超时（DeepSeek），也可能是接收到了空数据（OpenRouter）',
        )
        setStatus('ready')
      })
  }

  const handleSubmit = async () => {
    if (!apiKeys[config.provider]) {
      toast.error('请先配置 API Key')
      return
    }
    if (!input.trim() || status !== 'ready') return

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
    <div className="container py-8 space-y-4">
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

      <AIModelInfo />

      <Card className="flex flex-col h-[calc(100vh-20rem)] border-none">
        <CardContent className="flex-1 flex flex-col gap-4 p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
            <div className="space-y-6 min-h-[100px]">
              {messages.map(message => (
                <Message
                  key={message.id}
                  {...message}
                  onRetry={trySendMessage}
                />
              ))}
              {status === 'waiting' && (
                <div className="flex justify-start">
                  <LoadingIcon size="sm" />
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
              disabled={!input.trim() || status !== 'ready'}
            >
              <PaperPlaneIcon className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
