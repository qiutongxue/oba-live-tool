import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  useAutoMessageActions,
  useCurrentAutoMessage,
} from '@/hooks/useAutoMessage'
import MessageComp from '@/pages/AutoMessage/components/MessageComp'
import { PlusIcon } from 'lucide-react'
import { useMemoizedFn } from 'ahooks'
import React from 'react'

const MessageListCard = React.memo(() => {
  const messages = useCurrentAutoMessage(context => context.config.messages)
  const { setMessages } = useAutoMessageActions()

  const handleMessageChange = useMemoizedFn(message => {
    setMessages(messages.map(m => (m.id === message.id ? message : m)))
  })

  const handleAddMessage = useMemoizedFn(() => {
    setMessages([
      ...messages,
      {
        id: crypto.randomUUID(),
        content: '',
        pinTop: false,
      },
    ])
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>消息列表</Label>
              <p className="text-sm text-muted-foreground">
                添加需要自动发送的消息内容
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddMessage}>
              <PlusIcon className="mr-2 h-4 w-4" />
              添加消息
            </Button>
          </div>

          <div className="space-y-4 max-h-35 overflow-auto">
            {messages.map(message => (
              <MessageComp
                key={message.id}
                message={message}
                onChange={handleMessageChange}
                onDelete={id => setMessages(messages.filter(m => m.id !== id))}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default MessageListCard
