import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAIChatStore } from '@/hooks/useAIChat'
import { useToast } from '@/hooks/useToast'
import { messagesToContext } from '@/lib/utils'
import { PaperPlaneIcon } from '@radix-ui/react-icons'
import { useMemoizedFn } from 'ahooks'
import { useState } from 'react'

export default function ChatInput({
  onSubmit,
}: {
  onSubmit: (messages: { role: string; content: string }[]) => void
}) {
  const [input, setInput] = useState('')
  const { status, addMessage, messages, config, apiKeys } = useAIChatStore()
  const { toast } = useToast()

  const handleSubmit = useMemoizedFn(async () => {
    if (!apiKeys[config.provider]) {
      toast.error('请先配置 API Key')
      return
    }
    if (!input.trim() || status !== 'ready') return

    const userMessage = input.trim()
    setInput('')
    addMessage({ role: 'user', content: userMessage })
    const contextMessages = messagesToContext(messages, userMessage)
    onSubmit(contextMessages)
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
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
    </>
  )
}
