import { useMemoizedFn } from 'ahooks'
import { useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAutoMessageStore, useCurrentAutoMessage } from '@/hooks/useAutoMessage'
import { useConnectedTargetAccountIds } from '@/hooks/useMultiAccount'
import { useToast } from '@/hooks/useToast'
import MessageListCard from './components/MessageListCard'
import MessageSettingsCard from './components/MessageSettingsCard'
import { MessageOneKey } from './components/MessagesOneKey'
import MultiAccountSelector from './components/MultiAccountSelector'

/** 多账号自动发言控制：使用当前账号的配置作为模板，批量下发到所有选中的已连接账号 */
const useAutoMessageTaskControl = () => {
  const config = useCurrentAutoMessage(context => context.config)
  const targetAccountIds = useConnectedTargetAccountIds()
  const messageContexts = useAutoMessageStore(state => state.contexts)
  const { toast } = useToast()

  const anyRunning = targetAccountIds.some(id => messageContexts[id]?.isRunning)

  // useAutoMessageActions().setIsRunning 只作用于当前账号，这里直接按 id 更新
  const setIsRunningFor = useMemoizedFn((accountId: string, running: boolean) => {
    useAutoMessageStore.getState().setIsRunning(accountId, running)
  })

  const onStartTask = useMemoizedFn(async () => {
    if (targetAccountIds.length === 0) {
      toast.error('请先选择至少一个已连接的账号')
      return
    }
    const results = await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoMessage.startForAccounts,
      targetAccountIds,
      config,
    )
    let successCount = 0
    for (const result of results) {
      setIsRunningFor(result.accountId, result.success)
      if (result.success) successCount++
    }
    if (successCount === results.length) {
      toast.success(`已在 ${successCount} 个账号上启动自动发言`)
    } else if (successCount > 0) {
      toast.error(`${successCount} 个账号启动成功，${results.length - successCount} 个失败（详见日志）`)
    } else {
      toast.error('自动发言任务启动失败（详见日志）')
    }
  })

  const onStopTask = useMemoizedFn(async () => {
    if (targetAccountIds.length === 0) return
    await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoMessage.stopForAccounts,
      targetAccountIds,
    )
    for (const accountId of targetAccountIds) {
      setIsRunningFor(accountId, false)
    }
    toast.success('已停止所选账号的自动发言')
  })

  return {
    isRunning: anyRunning,
    connectionReady: targetAccountIds.length > 0,
    onStartTask,
    onStopTask,
  }
}

export default function AutoMessage() {
  const { isRunning, connectionReady, onStartTask, onStopTask } = useAutoMessageTaskControl()
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
          connectionReady={connectionReady}
          forbidden={!connectionReady}
        />
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <MultiAccountSelector />
        <MessageListCard />
        <MessageSettingsCard />
        <MessageOneKey />
      </div>
    </div>
  )
}
