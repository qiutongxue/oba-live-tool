import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import Messages from './components/Messages'
// TODO: 1. 按钮要设置 disabled 状态 : 已连接 && 平台是抖店或百应
// 2. 断开连接时，这边的监听任务也要关闭，具体为：关闭 page
// 3. 整合进 AutoReply 中（不需要单独开一个页面）
export function AutoReplyPlus() {
  const [liveRoomId, setLiveRoomId] = useState('')
  const getLiveRoomId = async () => {
    const liveRoomId = await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoReplyPlus.getLiveRoomId,
    )
    setLiveRoomId(liveRoomId)
  }
  return (
    <div>
      <h1>自动回复</h1>
      <Button
        onClick={() => {
          getLiveRoomId()
        }}
      >
        获取直播间ID
      </Button>
      <p>{liveRoomId}</p>
      <Messages />
    </div>
  )
}
