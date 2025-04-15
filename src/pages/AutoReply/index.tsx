import AIModelInfo from '@/components/ai-chat/AIModelInfo'
import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Button } from '@/components/ui/button'
import { useAutoReply } from '@/hooks/useAutoReply'
import CommentList from '@/pages/AutoReply/components/CommentList'
import PreviewList from '@/pages/AutoReply/components/PreviewList'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

export default function AutoReply() {
  const { isRunning, setIsRunning } = useAutoReply()
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null)

  const handleAutoReplyToggle = async () => {
    try {
      setIsRunning(!isRunning)
    } catch (error) {
      console.error('切换自动回复失败:', error)
    }
  }

  const navigate = useNavigate()

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
            {/* 用户屏蔽列表 */}
            <Button
              variant="outline"
              onClick={() => navigate('settings')}
              title="设置"
            >
              <Settings2 className="h-4 w-4" />
              <span>设置</span>
            </Button>
            <TaskButton
              isTaskRunning={isRunning}
              onStartStop={handleAutoReplyToggle}
            />
          </div>
        </div>
      </div>

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
