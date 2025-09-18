import { useMemoizedFn } from 'ahooks'
import { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAccounts } from '@/hooks/useAccounts'
import {
  useAutoMessageActions,
  useCurrentAutoMessage,
} from '@/hooks/useAutoMessage'
import { useToast } from '@/hooks/useToast'
import MessageListCard from './components/MessageListCard'
import MessageSettingsCard from './components/MessageSettingsCard'
import { MessageOneKey } from './components/MessagesOneKey'

const useTaskControl = () => {
  const isRunning = useCurrentAutoMessage(context => context.isRunning)
  const config = useCurrentAutoMessage(context => context.config)
  const { setIsRunning } = useAutoMessageActions()
  const { toast } = useToast()
  const accountId = useAccounts(store => store.currentAccountId)

  const onStartTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoMessage.start,
      accountId,
      config,
    )
    if (result) {
      setIsRunning(true)
      toast.success('自动消息任务已启动')
    } else {
      setIsRunning(false)
      toast.error('自动消息任务启动失败')
    }
  }, [config, setIsRunning, toast, accountId])

  const onStopTask = useCallback(async () => {
    await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoMessage.stop,
      accountId,
    )
    setIsRunning(false)
  }, [setIsRunning, accountId])

  return {
    isRunning,
    onStartTask,
    onStopTask,
  }
}

export default function AutoMessage() {
  const { isRunning, onStartTask, onStopTask } = useTaskControl()
  const [validationError] = useState<string | null>(null)

  const handleTaskButtonClick = useMemoizedFn(() => {
    if (!isRunning) onStartTask()
    else onStopTask()
  })

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="自动发言" description="配置自动发送消息的规则" />
        <TaskButton
          isTaskRunning={isRunning}
          onStartStop={handleTaskButtonClick}
        />
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
      </div>
    </div>
  )
}
