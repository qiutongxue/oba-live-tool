import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'

export function BlocklistManager() {
  const { updateBlockList, config } = useAutoReplyConfig()
  const blockedUsers = config.blockList
  const [newUser, setNewUser] = useState('')

  const handleAddUser = () => {
    if (!newUser.trim()) {
      return
    }
    const updatedList = [...blockedUsers, newUser.trim()]
    updateBlockList(updatedList)
    setNewUser('')
  }

  const handleRemoveUser = (index: number) => {
    const updatedList = blockedUsers.filter((_, i) => i !== index)
    updateBlockList(updatedList)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">用户屏蔽列表</h3>
        <p className="text-sm text-muted-foreground">屏蔽列表中的用户将不会被自动回复</p>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
        {blockedUsers.length === 0 ? (
          <div className="text-sm text-center py-4 text-muted-foreground">暂无屏蔽用户</div>
        ) : (
          blockedUsers.map((user, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 下标无妨
            <div key={index} className="flex items-center gap-2 group">
              <div className="flex-1 text-sm p-2 rounded bg-muted/50">{user}</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveUser(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="输入用户名..."
          value={newUser}
          onChange={e => setNewUser(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAddUser}>添加</Button>
      </div>
    </div>
  )
}
