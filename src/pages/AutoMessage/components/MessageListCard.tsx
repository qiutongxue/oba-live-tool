import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  useAutoMessageActions,
  useCurrentAutoMessage,
} from '@/hooks/useAutoMessage'
import MessageEditor from './MessageEditor'

const MessageListCard = React.memo(() => {
  const messages = useCurrentAutoMessage(context => context.config.messages)
  const { setMessages } = useAutoMessageActions()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>消息列表</Label>
              <p className="text-sm text-muted-foreground">
                添加需要自动发送的消息内容（一行一条）
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <MessageEditor
              messages={messages}
              onChange={messages => setMessages(messages)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default MessageListCard
