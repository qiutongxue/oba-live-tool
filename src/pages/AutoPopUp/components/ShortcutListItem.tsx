import { useMemoizedFn } from 'ahooks'
import { ArrowBigRightDash, Edit2Icon, Save, Trash2Icon, X } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { type ShortcutMapping, useAutoPopUpActions } from '@/hooks/useAutoPopUp'
import { useOSPlatform } from '@/hooks/useOSPlatform'
import { useToast } from '@/hooks/useToast'

interface ShortcutListItemProps {
  shortcut: ShortcutMapping
  isNew?: boolean
  checkDuplicateKey: (key: string) => boolean
  onSaved?: () => void
  onCancelled?: () => void
}

const PLATFORM_KEY_MAP = {
  win: {
    ctrl: '⌘ Ctrl',
    shift: '⇧ Shift',
    alt: '⌥ Alt',
  },
  mac: {
    ctrl: '⌘ Command',
    shift: '⇧ Shift',
    alt: '⌥ Option',
  },
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
  const [ctrlKey, setCtrlKey] = useState(shortcut.ctrl ?? false)
  const [altKey, setAltKey] = useState(shortcut.alt ?? false)
  const [shiftKey, setShiftKey] = useState(shortcut.shift ?? false)
  const { toast } = useToast()
  const osPlatform = useOSPlatform()

  const keyMap =
    osPlatform === 'MacOS' ? PLATFORM_KEY_MAP.mac : PLATFORM_KEY_MAP.win

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
        ctrl: ctrlKey,
        alt: altKey,
        shift: shiftKey,
        goodsIds: newGoodsIds,
      })
    } else {
      updateShortcut({
        ...shortcut,
        key: newKey,
        ctrl: ctrlKey,
        alt: altKey,
        shift: shiftKey,
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
    // 禁用 Alt、Shift、Ctrl、Command(Win)
    switch (e.key) {
      case 'Control':
      case 'Alt':
      case 'Shift':
      case 'Meta':
        return
    }
    // 小写转大写
    if ('a' <= e.key && e.key <= 'z') {
      setNewKey(e.key.toUpperCase())
    } else {
      setNewKey(e.key)
    }
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
            <div className="flex gap-2 items-center">
              {shortcut.ctrl && (
                <Badge variant={'outline'}>{keyMap.ctrl}</Badge>
              )}
              {shortcut.shift && (
                <Badge variant={'outline'}>
                  {/* <ArrowBigUpIcon className="w-4 h-4" /> */}
                  {keyMap.shift}
                </Badge>
              )}
              {shortcut.alt && (
                <Badge variant={'outline'}>
                  {/* <OptionIcon className="w-4 h-4" /> */}
                  {keyMap.alt}
                </Badge>
              )}
              <Badge variant={'outline'}>{shortcut.key}</Badge>
            </div>
            <span className="text-muted-foreground">
              <ArrowBigRightDash />
            </span>
            <div className="flex flex-wrap gap-1.5 max-w-xs">
              {shortcut.goodsIds.map((id, index) => (
                <span
                  key={`display-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: 使用下标不影响
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
          <div className="flex gap-2 justify-center items-center">
            <Toggle
              variant={'outline'}
              pressed={ctrlKey}
              onPressedChange={e => setCtrlKey(e)}
            >
              <span>{keyMap.ctrl}</span>
            </Toggle>
            <Toggle
              variant={'outline'}
              pressed={shiftKey}
              onPressedChange={e => setShiftKey(e)}
            >
              <span>{keyMap.shift}</span>
            </Toggle>
            <Toggle
              variant={'outline'}
              pressed={altKey}
              onPressedChange={e => setAltKey(e)}
            >
              <span>{keyMap.alt}</span>
            </Toggle>

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
        <div className="flex justify-between items-center">
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
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEditing}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveEditing}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShortcutListItem
