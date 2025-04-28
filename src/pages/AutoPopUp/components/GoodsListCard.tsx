import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAutoPopUpActions, useCurrentAutoPopUp } from '@/hooks/useAutoPopUp'
import { useToast } from '@/hooks/useToast'
import { useMemoizedFn } from 'ahooks'
import { PlusIcon } from 'lucide-react'
import React, { useState } from 'react'
import GoodsListItem from './GoodsListItem'
import ShortcutConfigTab from './ShortcutConfigTab'

const CommonList = () => {
  const goodsIds = useCurrentAutoPopUp(context => context.config.goodsIds)
  const { setGoodsIds } = useAutoPopUpActions()
  const { toast } = useToast()

  const handleGoodsIdChange = useMemoizedFn((index: number, value: string) => {
    const numValue = Number(value)
    if (Number.isNaN(numValue) || numValue < 1) {
      toast.error('请输入有效的商品序号')
      return
    }
    const newIds = [...goodsIds]
    if (newIds.includes(numValue)) {
      toast.error('商品序号不能重复！')
      return
    }
    newIds[index] = numValue

    setGoodsIds(newIds)
  })

  const addGoodsId = useMemoizedFn(() => {
    let id = 1
    while (goodsIds.includes(id)) id += 1
    setGoodsIds([...goodsIds, id])
  })
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>商品列表</Label>
          <p className="text-sm text-muted-foreground">
            添加需要自动弹出的商品序号
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
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            key={index}
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
    </>
  )
}

// 商品列表卡片组件
const GoodsListCard = React.memo(() => {
  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="goods-list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goods-list">商品列表</TabsTrigger>
            <TabsTrigger value="shortcuts">快捷键配置</TabsTrigger>
          </TabsList>

          <TabsContent value="goods-list" className="space-y-6 mt-4">
            <CommonList />
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-4">
            <ShortcutConfigTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
})

export default GoodsListCard
