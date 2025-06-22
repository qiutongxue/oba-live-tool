import { useAccounts } from '@/hooks/useAccounts'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { useMemoizedFn } from 'ahooks'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import React from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

export const AccountSwitcher = React.memo(() => {
  const {
    accounts,
    currentAccountId,
    addAccount,
    switchAccount,
    updateAccountName,
  } = useAccounts()
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [editingAccount, setEditingAccount] = useState<{
    id: string
    name: string
  } | null>(null)
  const { toast } = useToast()

  const handleAccountSwitch = useMemoizedFn(async (accountId: string) => {
    switchAccount(accountId)
    toast.success('切换账号成功')
  })

  const handleAddAccount = useMemoizedFn(() => {
    if (!newAccountName.trim()) {
      toast.error('请输入账号名称')
      return
    }

    if (accounts.some(account => account.name === newAccountName)) {
      toast.error('账号名称已存在')
      return
    }

    addAccount(newAccountName)
    setIsAddDialogOpen(false)
    setNewAccountName('')
    toast.success('添加账号成功')
  })

  const handleEditAccount = useMemoizedFn(() => {
    if (!editingAccount) return
    if (!editingAccount.name.trim()) {
      toast.error('请输入账号名称')
      return
    }

    if (
      accounts.some(
        account =>
          account.name === editingAccount.name &&
          account.id !== editingAccount.id,
      )
    ) {
      toast.error('账号名称已存在')
      return
    }

    updateAccountName(editingAccount.id, editingAccount.name)
    setIsEditDialogOpen(false)
    setEditingAccount(null)
    toast.success('修改账号名称成功')
  })

  const openEditDialog = useMemoizedFn(
    (account: { id: string; name: string }) => {
      setEditingAccount(account)
      setIsEditDialogOpen(true)
    },
  )

  // useWhyDidYouUpdate('AccountSwitcher', {
  //   accounts,
  //   currentAccountId,
  //   isConnected,
  //   isAddDialogOpen,
  //   isEditDialogOpen,
  //   newAccountName,
  //   editingAccount,
  //   toast,
  //   handleAccountSwitch,
  //   handleAddAccount,
  //   handleEditAccount,
  //   openEditDialog,
  //   setIsAddDialogOpen,
  //   setIsEditDialogOpen,
  //   setNewAccountName,
  //   setEditingAccount,
  // })

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={e => {
          e.stopPropagation()
          openEditDialog(
            accounts.find(acc => acc.id === currentAccountId) as Account,
          )
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Select
        disabled={isConnected === 'connecting'}
        value={currentAccountId}
        onValueChange={handleAccountSwitch}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="选择账号" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map(account => (
            <SelectItem
              key={account.id}
              value={account.id}
              className="flex items-center justify-between"
            >
              <span>{account.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsAddDialogOpen(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改账号名称</DialogTitle>
            <DialogDescription>账号名称不能重复</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="账号名称"
              value={editingAccount?.name ?? ''}
              onChange={e =>
                setEditingAccount(prev =>
                  prev ? { ...prev, name: e.target.value } : null,
                )
              }
            />
            <Button onClick={handleEditAccount}>确定</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})

AccountSwitcher.whyDidYouRender = true
