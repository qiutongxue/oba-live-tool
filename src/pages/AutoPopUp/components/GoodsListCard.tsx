import { useMemoizedFn } from 'ahooks'
import { PlusIcon } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAutoPopUpActions, useCurrentAutoPopUp } from '@/hooks/useAutoPopUp'
import { useToast } from '@/hooks/useToast'
import GoodsListItem from './GoodsListItem'
import ShortcutConfigTab from './ShortcutConfigTab'

const CommonList = () => {
  const goodsIds = useCurrentAutoPopUp(context => context.config.goodsIds)
  const goodsItems = useCurrentAutoPopUp(context => context.config.goodsItems)
  const { setGoodsIds, setGoodsItems } = useAutoPopUpActions()
  const { toast } = useToast()

  // 合并 goodsItems 和 goodsIds：以 goodsItems 为主，goodsIds 作为兼容
  const items = React.useMemo(() => {
    if (goodsItems && goodsItems.length > 0) return goodsItems
    return goodsIds.map(id => ({ id, repeatCount: 1, itemInterval: undefined }))
  }, [goodsItems, goodsIds])

  // 同步更新 goodsIds 和 goodsItems
  const syncUpdate = useMemoizedFn((newItems: typeof items) => {
    setGoodsItems(newItems)
    setGoodsIds(newItems.map(item => item.id))
  })

  const handleGoodsIdChange = useMemoizedFn((index: number, value: string) => {
    const numValue = Number(value)
    if (Number.isNaN(numValue) || numValue < 1) {
      toast.error('请输入有效的商品序号')
      return
    }
    if (items.some((item, i) => item.id === numValue && i !== index)) {
      toast.error('商品序号不能重复！')
      return
    }
    const newItems = items.map((item, i) => (i === index ? { ...item, id: numValue } : item))
    syncUpdate(newItems)
  })

  const handleRepeatCountChange = useMemoizedFn((index: number, value: number) => {
    const count = Math.max(1, Math.min(Math.floor(value), 10000))
    const newItems = items.map((item, i) =>
      i === index ? { ...item, repeatCount: count } : item,
    )
    syncUpdate(newItems)
  })

  const handleItemIntervalChange = useMemoizedFn((index: number, min: number, max: number) => {
    const minMs = Math.max(0, Math.floor(min)) * 1000
    const maxMs = Math.max(0, Math.floor(max)) * 1000
    const newItems = items.map((item, i) =>
      i === index
        ? {
            ...item,
            itemInterval:
              minMs === 0 && maxMs === 0
                ? undefined
                : ([minMs, maxMs] as [number, number]),
          }
        : item,
    )
    syncUpdate(newItems)
  })

  const addGoodsId = useMemoizedFn(() => {
    let id = 1
    while (items.some(item => item.id === id)) id += 1
    syncUpdate([...items, { id, repeatCount: 1, itemInterval: undefined }])
  })

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>商品列表</Label>
          <p className="text-sm text-muted-foreground">
            序号 x 循环次数 | 单品弹窗间隔（0 = 用全局间隔）
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addGoodsId}>
          <PlusIcon className="mr-2 h-4 w-4" />
          添加商品
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <GoodsListItem
            // biome-ignore lint/suspicious/noArrayIndexKey: 下标不影响
            key={index}
            item={item}
            index={index}
            onChangeId={handleGoodsIdChange}
            onChangeRepeatCount={handleRepeatCountChange}
            onChangeItemInterval={handleItemIntervalChange}
            onDelete={() => {
              syncUpdate(items.filter((_, i) => i !== index))
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
