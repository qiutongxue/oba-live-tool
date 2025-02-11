import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import CommentList from '@/components/auto-reply/CommentList'
import PreviewList from '@/components/auto-reply/PreviewList'
import { PromptCard } from '@/components/auto-reply/PromptCard'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { useAutoReplyStore } from '@/hooks/useAutoReply'
import { useState } from 'react'

export default function AutoReply() {
  const { isRunning: autoReplyEnabled, setIsRunning: setAutoReplyEnabled } = useAutoReplyStore()
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)

  const handleAutoReplyToggle = async () => {
    try {
      setAutoReplyEnabled(!autoReplyEnabled)
    }
    catch (error) {
      console.error('切换自动回复失败:', error)
    }
  }

  return (
    <div className="container py-8 space-y-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Title title="自动回复" description="查看直播间的实时评论并自动回复" />
          </div>
          <div className="flex items-center gap-2">
            <APIKeyDialog />
            <TaskButton
              isTaskRunning={autoReplyEnabled}
              onStartStop={handleAutoReplyToggle}
            />
          </div>
        </div>
      </div>

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
