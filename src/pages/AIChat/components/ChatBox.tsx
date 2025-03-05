import { LoadingIcon } from '@/components/icons/loading'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type ChatMessage, useAIChatStore } from '@/hooks/useAIChat'
import { useDebounceEffect, useMemoizedFn } from 'ahooks'
import React, { useEffect, useRef } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import ChatInput from './ChatInput'
import { Message } from './Message'

interface ContextMessage {
  role: string
  content: string
}

const useChatMessaging = () => {
  const {
    status,
    setStatus,
    addMessage,
    appendToChat,
    appendToReasoning,
    tryToHandleEmptyMessage,
    config,
    apiKeys,
    customBaseURL,
  } = useAIChatStore()

  const handleStreamMessage = useMemoizedFn(
    ({
      chunk,
      type,
    }: {
      chunk: string
      type: string // content | reasoning
    }) => {
      setStatus('replying')
      if (type === 'content') {
        appendToChat(chunk)
      } else if (type === 'reasoning') {
        appendToReasoning(chunk)
      }
    },
  )

  const sendMessage = useMemoizedFn(async (messages: ContextMessage[]) => {
    return new Promise<void>((resolve, reject) => {
      setStatus('waiting')

      const removeStreamListener = window.ipcRenderer.on(
        IPC_CHANNELS.tasks.aiChat.stream,
        ({ chunk, done, type }) => {
          if (done) {
            cleanup()
            resolve()
          } else if (chunk) {
            handleStreamMessage({ chunk, type })
          }
        },
      )

      const removeErrorHandler = window.ipcRenderer.on(
        IPC_CHANNELS.tasks.aiChat.error,
        ({ error }) => {
          cleanup()
          reject(error)
        },
      )

      const cleanup = () => {
        removeStreamListener()
        removeErrorHandler()
      }

      window.ipcRenderer
        .invoke(IPC_CHANNELS.tasks.aiChat.chat, {
          messages,
          apiKey: apiKeys[config.provider],
          provider: config.provider,
          model: config.model,
          customBaseURL: customBaseURL,
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
        tryToHandleEmptyMessage('可能是网络请求超时，也可能是接收到了空数据')
        setStatus('ready')
      })
  })

  return {
    status,
    sendMessage,
  }
}

const useScrollToBottom = (messages: ContextMessage[]) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

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

  return { scrollAreaRef }
}

const MessageList = React.memo(
  ({
    messages,
    status,
    onRetry,
  }: {
    messages: ChatMessage[]
    status: string
    onRetry: (messages: { role: string; content: string }[]) => Promise<void>
  }) => (
    <div className="space-y-6 min-h-[100px]">
      {messages.map(message => (
        <Message key={message.id} {...message} onRetry={onRetry} />
      ))}
      {status === 'waiting' && (
        <div className="flex justify-start">
          <LoadingIcon size="sm" />
        </div>
      )}
    </div>
  ),
)

export default function ChatBox() {
  const messages = useAIChatStore(state => state.messages)
  const { status, sendMessage } = useChatMessaging()
  const { scrollAreaRef } = useScrollToBottom(messages)

  return (
    <Card className="flex flex-col h-[calc(100vh-20rem)] border-none">
      <CardContent className="flex-1 flex flex-col gap-4 p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
          <MessageList
            messages={messages}
            status={status}
            onRetry={sendMessage}
          />
        </ScrollArea>

        <div className="flex gap-2 items-stretch p-4 border-t">
          <ChatInput onSubmit={sendMessage} />
        </div>
      </CardContent>
    </Card>
  )
}
