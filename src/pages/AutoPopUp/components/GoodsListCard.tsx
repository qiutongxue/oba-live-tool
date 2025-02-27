import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAutoPopUpActions, useCurrentAutoPopUp } from '@/hooks/useAutoPopUp'
import { PlusIcon } from '@radix-ui/react-icons'
import { useMemoizedFn } from 'ahooks'
import React from 'react'
import GoodsListItem from './GoodsListItem'
// 商品列表卡片组件
const GoodsListCard = React.memo(function GoodsListCard({
  onValidationError,
}: {
  onValidationError: (info: string | null) => void
}) {
  const goodsIds = useCurrentAutoPopUp(context => context.config.goodsIds)
  const { setGoodsIds } = useAutoPopUpActions()
  const handleGoodsIdChange = useMemoizedFn((index: number, value: string) => {
    const numValue = Number(value)
    if (Number.isNaN(numValue) || numValue < 1) {
      onValidationError('请输入有效的商品ID')
      return
    }
    const newIds = [...goodsIds]
    if (newIds.includes(numValue)) {
      onValidationError('商品ID不能重复！')
      return
    }
    newIds[index] = numValue

    onValidationError(null)
    setGoodsIds(newIds)
  })

  const addGoodsId = useMemoizedFn(() => {
    let id = 1
    while (goodsIds.includes(id)) id += 1
    setGoodsIds([...goodsIds, id])
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>商品列表</Label>
              <p className="text-sm text-muted-foreground">
                添加需要自动弹出的商品ID
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addGoodsId}>
              <PlusIcon className="mr-2 h-4 w-4" />
              添加商品
            </Button>
          </div>

          <div className="space-y-4">
            {goodsIds.map((id, index) => (
              <GoodsListItem
                key={id}
                id={id}
                index={index}
                onChange={handleGoodsIdChange}
                onDelete={() => {
                  const newGoodsIds = goodsIds.filter((_, i) => i !== index)
                  setGoodsIds(newGoodsIds)
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default GoodsListCard
