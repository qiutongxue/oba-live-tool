import { CheckCheck, X } from 'lucide-react'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAccounts } from '@/hooks/useAccounts'
import { useMultiAccountStore } from '@/hooks/useMultiAccount'
import { useAutoMessageStore } from '@/hooks/useAutoMessage'
import { useLiveControlStore } from '@/hooks/useLiveControl'

/** 多账号发言目标选择器：勾选的账号会同时使用当前配置发言 */
const MultiAccountSelector = React.memo(() => {
  const accounts = useAccounts(state => state.accounts)
  const selectedAccountIds = useMultiAccountStore(state => state.selectedAccountIds)
  const { toggleAccount, selectAll, clear } = useMultiAccountStore()
  const connectionContexts = useLiveControlStore(state => state.contexts)
  const messageContexts = useAutoMessageStore(state => state.contexts)

  const connectedIds = accounts
    .filter(account => connectionContexts[account.id]?.isConnected === 'connected')
    .map(account => account.id)
  const usableSelectedCount = selectedAccountIds.filter(id => connectedIds.includes(id)).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>发言账号</CardTitle>
            <CardDescription>
              勾选的账号将同时使用当前配置发言（各账号需先在「直播控制台」连接）
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              已选 {selectedAccountIds.length}（可用 {usableSelectedCount}）
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAll(connectedIds)}
              disabled={connectedIds.length === 0}
            >
              <CheckCheck className="mr-1 h-4 w-4" />
              全选已连接
            </Button>
            <Button variant="ghost" size="sm" onClick={clear} disabled={!selectedAccountIds.length}>
              <X className="mr-1 h-4 w-4" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无账号，请先在顶部添加账号</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map(account => {
              const status = connectionContexts[account.id]?.isConnected ?? 'disconnected'
              const isConnected = status === 'connected'
              const isRunning = messageContexts[account.id]?.isRunning ?? false
              const isSelected = selectedAccountIds.includes(account.id)
              return (
                <label
                  key={account.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  } ${isConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={!isConnected}
                    onCheckedChange={() => toggleAccount(account.id)}
                    aria-label={`选择账号 ${account.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{account.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={isConnected ? 'default' : 'outline'} className="text-[10px]">
                        {isConnected ? '已连接' : status === 'connecting' ? '连接中' : '未连接'}
                      </Badge>
                      {isRunning && (
                        <Badge variant="destructive" className="text-[10px]">
                          发言中
                        </Badge>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

export default MultiAccountSelector
