import { TrashIcon } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface GoodsItemData {
  id: number
  repeatCount?: number
  repeatInfinite?: boolean
  itemInterval?: [number, number]
}

// 商品列表项组件
const GoodsListItem = React.memo(function GoodsListItem({
  item,
  index,
  onChangeId,
  onChangeRepeatCount,
  onChangeRepeatInfinite,
  onChangeItemInterval,
  onDelete,
}: {
  item: GoodsItemData
  index: number
  onChangeId: (index: number, value: string) => void
  onChangeRepeatCount: (index: number, value: number) => void
  onChangeRepeatInfinite: (index: number, value: boolean) => void
  onChangeItemInterval: (index: number, min: number, max: number) => void
  onDelete: () => void
}) {
  const repeatCount = item.repeatCount ?? 1
  const repeatInfinite = item.repeatInfinite ?? false
  const intervalMin = item.itemInterval ? item.itemInterval[0] / 1000 : 0
  const intervalMax = item.itemInterval ? item.itemInterval[1] / 1000 : 0

  return (
    <div className="flex gap-2 items-center group">
      <Input
        type="number"
        value={item.id}
        onChange={e => onChangeId(index, e.target.value)}
        className="w-20"
        min="1"
        placeholder="序号"
        title="商品序号"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">x</span>
      <Input
        type="number"
        value={repeatInfinite ? '' : repeatCount}
        onChange={e => onChangeRepeatCount(index, Number(e.target.value) || 1)}
        className="w-20"
        min="1"
        max="10000"
        placeholder={repeatInfinite ? '无限' : '次数'}
        disabled={repeatInfinite}
        title="循环弹窗次数"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">次</span>
      <Button
        type="button"
        variant={repeatInfinite ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChangeRepeatInfinite(index, !repeatInfinite)}
        className={cn('h-9 shrink-0 px-2 text-xs', repeatInfinite && 'font-medium')}
        title="无限循环：该商品永远参与轮转，不受 10000 次上限约束"
      >
        无限
      </Button>
      <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">间隔</span>
      <Input
        type="number"
        value={intervalMin}
        onChange={e => onChangeItemInterval(index, Number(e.target.value) || 0, intervalMax)}
        className="w-20"
        min="0"
        max="20000"
        placeholder="最小"
        title="单品弹窗间隔最小值（秒），0 表示用全局间隔"
      />
      <span className="text-xs text-muted-foreground">~</span>
      <Input
        type="number"
        value={intervalMax}
        onChange={e => onChangeItemInterval(index, intervalMin, Number(e.target.value) || 0)}
        className="w-20"
        min="0"
        max="20000"
        placeholder="最大"
        title="单品弹窗间隔最大值（秒），0 表示用全局间隔"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">秒</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 shrink-0"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  )
})

export default GoodsListItem
