import AIModelInfo from '@/components/ai-chat/AIModelInfo'
import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Badge } from '@/components/ui/badge'
import { useAIChatStore } from '@/hooks/useAIChat'
import { useAutoReply } from '@/hooks/useAutoReply'
import CommentList from '@/pages/AutoReply/components/CommentList'
import PreviewList from '@/pages/AutoReply/components/PreviewList'
import { PromptCard } from '@/pages/AutoReply/components/PromptCard'
import { useState } from 'react'
import { providers } from 'shared/providers'

export default function AutoReply() {
  const { isRunning, setIsRunning } = useAutoReply()
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null)
  const aiConfig = useAIChatStore(state => state.config)

  const handleAutoReplyToggle = async () => {
    try {
      setIsRunning(!isRunning)
    } catch (error) {
      console.error('切换自动回复失败:', error)
    }
  }

  return (
    <div className="container py-8 space-y-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Title
              title="自动回复"
              description="查看直播间的实时评论并自动回复"
            />
          </div>
          <div className="flex items-center gap-2">
            <APIKeyDialog />
            <TaskButton
              isTaskRunning={isRunning}
              onStartStop={handleAutoReplyToggle}
            />
          </div>
        </div>
      </div>

      <AIModelInfo />
      {/* Prompt 配置 Drawer */}

      <PromptCard />

      {/* 评论和回复区域 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 评论列表卡片 */}
        <CommentList highlight={highlightedCommentId} />

        {/* 回复预览卡片 */}
        <PreviewList setHighLight={setHighlightedCommentId} />
      </div>
    </div>
  )
}
