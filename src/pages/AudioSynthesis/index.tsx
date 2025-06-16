import { Button } from '@/components/ui/button'
import { useAIChatStore } from '@/hooks/useAIChat'
import { TrashIcon } from 'lucide-react'

export default function AIChat() {
  const { messages, clearMessages } = useAIChatStore()

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">tts音频合成页面</div>
    </div>
  )
}
