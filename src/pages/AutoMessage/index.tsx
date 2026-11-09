import { useMemoizedFn } from 'ahooks'
import { useState } from 'react'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAutoMessageActions, useCurrentAutoMessage } from '@/hooks/useAutoMessage'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useTaskControl } from '@/hooks/useTaskControl'
import CommentScrollCard from './components/CommentScrollCard'
import MessageListCard from './components/MessageListCard'
import MessageSettingsCard from './components/MessageSettingsCard'
import { MessageOneKey } from './components/MessagesOneKey'

const useAutoMessageTaskControl = () => {
  const isRunning = useCurrentAutoMessage(context => context.isRunning)
  const config = useCurrentAutoMessage(context => context.config)
  const { setIsRunning } = useAutoMessageActions()

  return useTaskControl({
    taskType: 'auto-comment',
    getIsRunning: () => isRunning,
    getConfig: () => config,
    setIsRunning,
    startSuccessMessage: '自动消息任务已启动',
    startFailureMessage: '自动消息任务启动失败',
  })
}

export default function AutoMessage() {
  const { isRunning, onStartTask, onStopTask } = useAutoMessageTaskControl()
  const [validationError] = useState<string | null>(null)
  const platform = useCurrentLiveControl(state => state.platform)

  const handleTaskButtonClick = useMemoizedFn(() => {
    if (!isRunning) onStartTask()
    else onStopTask()
  })

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="自动发言" description="配置自动发送消息的规则" />
        <TaskButton isTaskRunning={isRunning} onStartStop={handleTaskButtonClick} />
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <MessageListCard />
        <MessageSettingsCard />
        <MessageOneKey />
        {/* 评论管理自动滚动目前只有抖音团购（eos）中控台需要 */}
        {platform === 'eos' && <CommentScrollCard />}
      </div>
    </div>
  )
}
