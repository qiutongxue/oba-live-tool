import { useMemoizedFn } from 'ahooks'
import { useCallback } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import {
  useAutoPopUpActions,
  useCurrentAutoPopUp,
  useShortcutListener,
} from '@/hooks/useAutoPopUp'
import { useToast } from '@/hooks/useToast'
import GoodsListCard from './components/GoodsListCard'
import PopUpSettingsCard from './components/PopUpSettingsCard'

const useTaskControl = () => {
  const isRunning = useCurrentAutoPopUp(context => context.isRunning)
  const config = useCurrentAutoPopUp(context => context.config)
  const { setIsRunning } = useAutoPopUpActions()
  const { toast } = useToast()

  const onStartTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoPopUp.start,
      config,
    )
    if (result) {
      setIsRunning(true)
      toast.success('自动弹窗任务已启动')
    } else {
      setIsRunning(false)
      toast.error('自动弹窗任务启动失败')
    }
  }, [config, setIsRunning, toast])

  const onStopTask = useCallback(async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoPopUp.stop)
    setIsRunning(false)
  }, [setIsRunning])

  return {
    isRunning,
    onStartTask,
    onStopTask,
  }
}

export default function AutoPopUp() {
  const { isRunning, onStartTask, onStopTask } = useTaskControl()

  const handleTaskButtonClick = useMemoizedFn(() => {
    if (!isRunning) onStartTask()
    else onStopTask()
  })

  useShortcutListener()

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="自动弹窗" description="配置自动弹出商品的规则" />
        <TaskButton
          isTaskRunning={isRunning}
          onStartStop={handleTaskButtonClick}
        />
      </div>

      <div className="grid gap-6">
        <GoodsListCard />
        <PopUpSettingsCard />
      </div>
    </div>
  )
}
