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
            <div>
              <p className="text-xs text-muted-foreground">
                提示：可以使用变量{' '}
                <span className="bg-gray-100 font-bold">{'{候选A/候选B}'}</span>
                ，发送时将自动从候选项中随机选择一个替换
              </p>
              <p className="text-xs text-muted-foreground">
                如：{'欢迎'}
                <span className="bg-gray-100 font-bold">
                  {'{宝宝/家人/老铁}'}
                </span>
                {'进入直播间 -> 欢迎家人进入直播间'}
              </p>
            </div>
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
