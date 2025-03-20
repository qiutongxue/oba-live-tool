import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAccounts } from '@/hooks/useAccounts'
import { useAutoReplyStore } from '@/hooks/useAutoReply'
import { Settings2, X } from 'lucide-react'
import { useState } from 'react'

export function Blocklist() {
  const [inputValue, setInputValue] = useState('')
  const [showBlocklist, setShowBlocklist] = useState(false)
  const { currentAccountId } = useAccounts()
  const { contexts, setUserBlocklist } = useAutoReplyStore()
  const userBlocklist = contexts[currentAccountId]?.userBlocklist || []

  const handleAdd = () => {
    if (!inputValue.trim()) return
    const newList = [...new Set([...userBlocklist, inputValue.trim()])]
    setUserBlocklist(currentAccountId, newList)
    setInputValue('')
  }

  const handleRemove = (username: string) => {
    const newList = userBlocklist.filter(item => item !== username)
    setUserBlocklist(currentAccountId, newList)
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          setShowBlocklist(true)
        }}
        title="屏蔽设置"
      >
        <Settings2 className="h-4 w-4" />
      </Button>

      <Sheet open={showBlocklist} onOpenChange={setShowBlocklist}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>用户屏蔽设置</SheetTitle>
            <SheetDescription>
              在此列表中的用户发送的评论将不会被自动回复
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="输入用户名"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <Button onClick={handleAdd}>添加</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {userBlocklist.map(username => (
                <Badge key={username} variant="secondary" className="gap-1">
                  {username}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemove(username)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
