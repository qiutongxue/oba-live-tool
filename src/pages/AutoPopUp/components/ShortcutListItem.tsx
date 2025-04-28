import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  type ShortcutMapping,
  useAutoPopUpActions,
  useCurrentAutoPopUp,
} from '@/hooks/useAutoPopUp'
import { useToast } from '@/hooks/useToast'
import { useMemoizedFn } from 'ahooks'
import {
  ArrowBigRightDash,
  Edit2Icon,
  KeyRoundIcon,
  Save,
  Trash2Icon,
  X,
} from 'lucide-react'
import type React from 'react'
import { useState } from 'react'

interface ShortcutListItemProps {
  shortcut: ShortcutMapping
  isNew?: boolean
  checkDuplicateKey: (key: string) => boolean
  onSaved?: () => void
  onCancelled?: () => void
}

const ShortcutListItem: React.FC<ShortcutListItemProps> = ({
  shortcut,
  isNew,
  checkDuplicateKey,
  onSaved,
  onCancelled,
}) => {
  const { addShortcut, removeShortcut, updateShortcut } = useAutoPopUpActions()
  const [isEditing, setIsEditing] = useState(isNew) // 如果是新建，直接进入编辑模式
  const [isRecordingKey, setIsRecordingKey] = useState(false)
  const [newKey, setNewKey] = useState(shortcut.key)
  const [newGoodsIds, setNewGoodsIds] = useState<number[]>(shortcut.goodsIds)
  const [newGoodsIdInput, setNewGoodsIdInput] = useState('')
  const { toast } = useToast()
  // 开始编辑
  const startEditing = useMemoizedFn(() => {
    setIsEditing(true)
    setNewKey(shortcut.key)
    setNewGoodsIds([...shortcut.goodsIds])
  })

  // 取消编辑
  const cancelEditing = useMemoizedFn(() => {
    setIsEditing(false)
    setIsRecordingKey(false)
    onCancelled?.()
  })

  // 保存编辑
  const saveEditing = useMemoizedFn(() => {
    // 验证快捷键
    if (!newKey) {
      toast.error('快捷键不能为空')
      return
    }

    // 检查快捷键是否重复
    if (checkDuplicateKey(newKey)) {
      toast.error(`快捷键 "${newKey}" 已被使用`)
      return
    }

    if (isNew) {
      addShortcut({
        ...shortcut,
        key: newKey,
        goodsIds: newGoodsIds,
      })
    } else {
      //FIXME: 这边要改（下面的两个方法不能共存，要想一个好的方法处理新增和修改）
      updateShortcut({
        ...shortcut,
        key: newKey,
        goodsIds: newGoodsIds,
      })
    }

    setIsEditing(false)
    setIsRecordingKey(false)
    onSaved?.()
  })

  // 删除快捷键
  const deleteShortcut = useMemoizedFn(() => {
    removeShortcut(shortcut.id)
  })

  // 记录快捷键
  const startRecordingKey = useMemoizedFn(() => {
    setIsRecordingKey(true)
  })

  // 处理键盘按下事件
  const handleKeyDown = useMemoizedFn((e: React.KeyboardEvent) => {
    if (!isRecordingKey) return
    e.preventDefault()
    setNewKey(e.key)
    setIsRecordingKey(false)
  })

  // 添加商品ID
  const addGoodsId = useMemoizedFn(() => {
    const goodsId = Number(newGoodsIdInput)
    if (!newGoodsIdInput || Number.isNaN(goodsId) || goodsId < 1) {
      toast.error('请输入有效的商品序号')
      return
    }

    if (newGoodsIds.includes(goodsId)) {
      toast.error('商品序号不能重复')
      return
    }

    setNewGoodsIds([...newGoodsIds, goodsId])
    setNewGoodsIdInput('')
  })

  // 删除商品ID
  const removeGoodsId = useMemoizedFn((goodsIdToRemove: number) => {
    setNewGoodsIds(newGoodsIds.filter(id => id !== goodsIdToRemove))
  })

  // 渲染查看模式
  if (!isEditing) {
    return (
      <div className="border rounded-md p-3 shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <KeyRoundIcon className="h-5 w-5 text-muted-foreground" />
            <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-md font-medium">
              {shortcut.key}
            </span>
            <span className="text-muted-foreground">
              <ArrowBigRightDash />
            </span>
            <div className="flex flex-wrap gap-1.5 max-w-xs">
              {shortcut.goodsIds.map((id, index) => (
                <span
                  key={`display-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    index
                  }`}
                  className="bg-muted px-2 py-0.5 rounded text-sm"
                >
                  {id}
                </span>
              ))}
              {shortcut.goodsIds.length === 0 && (
                <span className="text-sm text-muted-foreground italic">
                  未设置商品
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={startEditing}
              title="编辑此快捷键映射"
            >
              <Edit2Icon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteShortcut}
              className="text-destructive"
              title="删除此快捷键映射"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染编辑模式
  return (
    <div className="border rounded-md p-4 space-y-4 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <KeyRoundIcon className="h-5 w-5 text-muted-foreground" />
          {isRecordingKey ? (
            <div className="flex items-center space-x-2">
              <Input
                className="w-24 bg-primary/5 border-primary/20"
                placeholder="按下键盘..."
                value={newKey}
                onKeyDown={handleKeyDown}
                readOnly
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="inline-block px-3 py-1.5 bg-primary/10 text-primary rounded-md font-medium">
                {newKey || '未设置'}
              </span>
              <Button variant="outline" size="sm" onClick={startRecordingKey}>
                修改按键
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveEditing}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            保存
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelEditing}
            className="gap-1.5"
          >
            <X className="h-4 w-4" />
            取消
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">商品列表</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {newGoodsIds.map(goodsId => (
            <div
              key={`edit-${goodsId}`}
              className="flex items-center space-x-1 bg-muted rounded-md px-2 py-1 group"
            >
              <span className="text-sm">{goodsId}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-60 group-hover:opacity-100"
                onClick={() => removeGoodsId(goodsId)}
              >
                <Trash2Icon className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {newGoodsIds.length === 0 && (
            <span className="text-sm text-muted-foreground italic py-1">
              请添加商品序号
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            placeholder="输入商品序号"
            className="w-32"
            min="1"
            value={newGoodsIdInput}
            onChange={e => setNewGoodsIdInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addGoodsId()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGoodsId}
          >
            添加
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ShortcutListItem
