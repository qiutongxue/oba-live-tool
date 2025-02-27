import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { Message } from '@/hooks/useAutoMessage'
import { TrashIcon } from 'lucide-react'
import React from 'react'

const MessageComp = React.memo(
  ({
    message,
    onChange,
    onDelete,
  }: {
    message: Message
    onChange: (message: Message) => void
    onDelete: (id: string) => void
  }) => {
    return (
      <div className="flex gap-3 items-start group">
        <div className="flex-1 space-y-2">
          <Input
            value={message.content}
            onChange={e => {
              if (e.target.value.length > 50) {
                return
              }
              onChange({ ...message, content: e.target.value })
            }}
            className={message.content.length > 50 ? 'border-destructive' : ''}
            placeholder="输入消息内容"
          />
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`pin-${message.id}`}
                checked={message.pinTop}
                onCheckedChange={checked => {
                  onChange({ ...message, pinTop: !!checked })
                }}
              />
              <label
                htmlFor={`pin-${message.id}`}
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                置顶此消息
              </label>
            </div>
            <span
              className={`text-xs ${
                message.content.length > 50
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {message.content.length}
              /50
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(message.id)}
          className="opacity-0 group-hover:opacity-100 self-start"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  },
)

export default MessageComp
