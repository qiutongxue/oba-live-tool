import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { useAutoReplyPlusStore } from '@/hooks/useAutoReplyPlus'
import { useLiveControlStore } from '@/hooks/useLiveControl'
import Messages from './components/Messages'
import SettingsDialog from './components/Settings'
// TODO: 1. 按钮要设置 disabled 状态 : 已连接 && 平台是抖店或百应
// 2. 断开连接时，这边的监听任务也要关闭，具体为：关闭 page
// 3. 整合进 AutoReply 中（不需要单独开一个页面）
export function AutoReplyPlus() {
  return (
    <div className="container py-8 space-y-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Title
              title="自动回复 Plus"
              description="查看直播间的实时消息并自动回复"
            />
          </div>
          <div className="flex items-center gap-2">
            <SettingsDialog />
          </div>
        </div>
      </div>
      <Messages />
    </div>
  )
}
