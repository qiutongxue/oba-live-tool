import { useMemoizedFn } from 'ahooks'
import { PlusIcon } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoPopUpActions, useCurrentAutoPopUp } from '@/hooks/useAutoPopUp'
import ShortcutListItem from './ShortcutListItem'

const ShortcutConfigTab = React.memo(() => {
  const shortcuts = useCurrentAutoPopUp(context => context.shortcuts ?? [])
  const isGlobalShortcut = useCurrentAutoPopUp(ctx => ctx.isGlobalShortcut)
  const { setGlobalShortcut } = useAutoPopUpActions()
  const [isAddingNew, setIsAddingNew] = useState(false)

  // 检查快捷键是否重复
  const checkDuplicateKey = useCallback(
    (key: string, currentId: string): boolean => {
      return shortcuts.some(s => s.key === key && s.id !== currentId)
    },
    [shortcuts],
  )

  // 添加新的快捷键配置
  const addNewShortcut = useMemoizedFn(() => {
    setIsAddingNew(true)
  })

  // 当新快捷键创建完成
  const handleNewShortcutCreated = useMemoizedFn(() => {
    setIsAddingNew(false)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>全局快捷键</Label>
          <p className="text-sm text-muted-foreground">
            开启后程序后台运行时也可触发，建议使用<strong>组合键</strong>
          </p>
        </div>
        <Switch
          checked={isGlobalShortcut}
          onCheckedChange={setGlobalShortcut}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>快捷键映射</Label>
          <p className="text-sm text-muted-foreground">
            配置快捷键以快速切换商品列表
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addNewShortcut}
          disabled={isAddingNew}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          添加快捷键
        </Button>
      </div>

      <div className="space-y-4">
        {/* 新建快捷键表单 */}
        {isAddingNew && (
          <ShortcutListItem
            shortcut={{ id: crypto.randomUUID(), key: '', goodsIds: [] }}
            isNew
            checkDuplicateKey={key => checkDuplicateKey(key, '')}
            onSaved={handleNewShortcutCreated}
            onCancelled={handleNewShortcutCreated}
          />
        )}

        {/* 现有快捷键列表 */}
        {shortcuts.length === 0 && !isAddingNew ? (
          <div className="text-center py-6 text-muted-foreground">
            暂无快捷键配置，点击"添加快捷键"按钮开始配置
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {shortcuts.map((shortcut, _index) => (
              <ShortcutListItem
                key={`shortcut-${shortcut.id}`}
                shortcut={shortcut}
                checkDuplicateKey={key => checkDuplicateKey(key, shortcut.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export default ShortcutConfigTab
