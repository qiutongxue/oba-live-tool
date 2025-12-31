import { TrashIcon } from 'lucide-react'
import AIModelInfo from '@/components/ai-chat/AIModelInfo'
import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import { Button } from '@/components/ui/button'
import { useAIChatStore } from '@/hooks/useAIChat'
import ChatBox from './components/ChatBox'

export default function AIChat() {
  const { messages, clearMessages } = useAIChatStore()

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI 助手</h1>
          <p className="text-muted-foreground mt-2">与 AI 助手进行对话，获取帮助。</p>
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

      <ChatBox />
    </div>
  )
}
