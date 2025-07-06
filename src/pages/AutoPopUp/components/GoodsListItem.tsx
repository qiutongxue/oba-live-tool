import { TrashIcon } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// 商品列表项组件
const GoodsListItem = React.memo(function GoodsListItem({
  id,
  index,
  onChange,
  onDelete,
}: {
  id: number
  index: number
  onChange: (index: number, value: string) => void
  onDelete: () => void
}) {
  return (
    <div className="flex gap-3 items-center group">
      <Input
        type="number"
        value={id}
        onChange={e => onChange(index, e.target.value)}
        className="w-32"
        min="1"
        placeholder="商品序号"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  )
})

export default GoodsListItem
