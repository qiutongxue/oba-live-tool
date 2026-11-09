import { useMemoizedFn } from 'ahooks'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Title } from '@/components/common/Title'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import {
  useCurrentSeckillConfig,
  useCurrentSeckillGoods,
  useSeckillActions,
} from '@/hooks/useSeckill'
import { cn } from '@/lib/utils'

/**
 * 秒杀补货。
 *
 * 手动模式：这里读货架、改参数、点补货；悬浮窗只负责「哪个商品要补、点一下」。
 * 自动模式：先把手动链路在真机上跑通再开（见页面底部说明）。
 */
export default function Seckill() {
  const connected = useCurrentLiveControl(state => state.isConnected === 'connected')
  const goods = useCurrentSeckillGoods(context => context.goods)
  const lastReadAt = useCurrentSeckillGoods(context => context.lastReadAt)
  const loading = useCurrentSeckillGoods(context => context.loading)
  const config = useCurrentSeckillConfig()
  const { read, restock, dump, recordClick, openFloat, applyFloatMode, updateConfig } =
    useSeckillActions()

  const [busyIndex, setBusyIndex] = useState<number | null>(null)

  // 进页面时如果还没读过，自动读一次
  useEffect(() => {
    if (connected && lastReadAt === null && !loading) void read()
  }, [connected, lastReadAt, loading, read])

  const handleRead = useMemoizedFn(() => {
    void read()
  })

  const handleRestock = useMemoizedFn(async (index: number) => {
    setBusyIndex(index)
    try {
      await restock(index, config.addCount)
      await read()
    } finally {
      setBusyIndex(null)
    }
  })

  const soldOutCount = goods.filter(g => g.soldOut).length

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="秒杀补货" description="监控货架上的秒杀商品，售罄后一键补库存" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openFloat()}>
            <ExternalLink className="w-4 h-4 mr-1.5" />
            打开悬浮窗
          </Button>
          <Button size="sm" onClick={handleRead} disabled={!connected || loading}>
            <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
            {loading ? '读取中…' : '读取货架'}
          </Button>
        </div>
      </div>

      {!connected && (
        <div className="text-sm text-muted-foreground">
          需要先连接直播控制台（抖音团购）才能读取货架。
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>补货参数</CardTitle>
            <CardDescription>
              补货时读「投放库存」当前值再加下面的件数；售罄后先等一段时间，避免刚补就被秒。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-count">每次补货 +N 件</Label>
              <Input
                id="add-count"
                type="number"
                min={1}
                value={config.addCount}
                onChange={e =>
                  updateConfig({
                    addCount: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delay">售罄后延迟（秒）</Label>
              <Input
                id="delay"
                type="number"
                min={0}
                value={config.delaySeconds}
                onChange={e =>
                  updateConfig({
                    delaySeconds: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>补货入口</Label>
              <div className="flex h-9 items-center gap-2 text-sm">
                <Switch
                  checked={config.manualEntry}
                  onCheckedChange={checked => updateConfig({ manualEntry: checked })}
                />
                <span className="text-muted-foreground">
                  {config.manualEntry ? '我手动点开弹窗' : '程序自动点'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>悬浮窗打开方式</Label>
              <div className="flex h-9 items-center gap-2 text-sm">
                <Switch
                  checked={config.floatMode === 'auto'}
                  onCheckedChange={checked => applyFloatMode(checked ? 'auto' : 'shortcut')}
                />
                <span className="text-muted-foreground">
                  {config.floatMode === 'auto' ? '售罄时自动弹出' : '只按快捷键（Ctrl+Shift+B）'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>
                  货架商品
                  {goods.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      共 {goods.length} 个 · 售罄 {soldOutCount} 个
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {lastReadAt
                    ? `上次读取：${new Date(lastReadAt).toLocaleTimeString('zh-CN')}`
                    : '还没有读取过'}
                  {config.manualEntry && (
                    <span className="ml-2 text-amber-600">
                      手动模式：点「补货」后，请到页面上点闹钟图标 → 编辑，我会自动填数并提交
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => void recordClick()}>
                  抓取一次点击
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void dump()}>
                  导出页面结构
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {goods.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {connected ? '点右上角「读取货架」试试' : '连接中控台后这里会显示商品列表'}
              </div>
            ) : (
              <div className="divide-y">
                {goods.map(item => (
                  <div key={item.index} className="flex items-center gap-3 py-2.5">
                    <span className="w-6 text-xs text-muted-foreground tabular-nums">
                      {item.index}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{item.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {item.price && <span>秒杀价 ¥{item.price}</span>}
                        {item.stock !== null ? (
                          <span>
                            仅剩{' '}
                            <span className={cn(item.soldOut && 'text-red-500 font-medium')}>
                              {item.stock}
                            </span>{' '}
                            件
                          </span>
                        ) : item.soldStockText ? (
                          <span>已售/库存 {item.soldStockText}</span>
                        ) : null}
                        {item.soldOut && <span className="text-red-500">已售罄</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={item.soldOut ? 'default' : 'outline'}
                      disabled={busyIndex !== null}
                      onClick={() => void handleRestock(item.index)}
                    >
                      {busyIndex === item.index ? '补货中…' : `补货 +${config.addCount}`}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          自动补货还没开放：补货要在「投放秒杀」弹窗里改数和提交，先把手动链路在真机上跑通、确认选择器稳定，再接自动循环。
        </p>
      </div>
    </div>
  )
}
