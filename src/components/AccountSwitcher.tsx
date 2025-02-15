import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/useToast'
import { PlusIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export function AccountSwitcher() {
  const { accounts, currentAccountId, addAccount, switchAccount } = useAccounts()
  const [isOpen, setIsOpen] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const { toast } = useToast()

  async function handleAccountSwitch(accountId: string) {
    switchAccount(accountId)
    toast.success('切换账号成功')
  }

  function handleAddAccount() {
    if (!newAccountName.trim()) {
      toast.error('请输入账号名称')
      return
    }

    addAccount(newAccountName)
    setIsOpen(false)
    setNewAccountName('')
    toast.success('添加账号成功')
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentAccountId} onValueChange={handleAccountSwitch}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="选择账号" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map(account => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={() => setIsOpen(true)}>
        <PlusIcon className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新账号</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="账号名称"
              value={newAccountName}
              onChange={e => setNewAccountName(e.target.value)}
            />
            <Button onClick={handleAddAccount}>确定</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
