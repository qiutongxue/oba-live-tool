import { useMemoizedFn } from 'ahooks'
import { RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Button } from '@/components/ui/button'
import {
  useCurrentSeckillConfig,
  useCurrentSeckillGoods,
  useSeckillActions,
} from '@/hooks/useSeckill'
import { cn } from '@/lib/utils'

/**
 * 秒杀补货悬浮窗（独立窗口，`#/seckill-float`）。
 *
 * 只回答一个问题：**哪个商品需要补货**。所以这里不显示价格、不看库存明细，
 * 只有「商品名 + 补货按钮 + 忽略」。
 */
export default function SeckillFloat() {
  const goods = useCurrentSeckillGoods(context => context.goods)
  const loading = useCurrentSeckillGoods(context => context.loading)
  const config = useCurrentSeckillConfig()
  const { read, restock } = useSeckillActions()

  /** 已忽略的商品（本次打开期间不再提示） */
  const [ignored, setIgnored] = useState<number[]>([])
  const [busyIndex, setBusyIndex] = useState<number | null>(null)

  useEffect(() => {
    void read()
  }, [read])

  const pending = useMemo(
    () => goods.filter(item => item.soldOut && !ignored.includes(item.index)),
    [goods, ignored],
  )

  const handleRestock = useMemoizedFn(async (index: number) => {
    setBusyIndex(index)
    try {
      const result = await restock(index, config.addCount)
      if (result?.verified) {
        setIgnored(prev => [...prev, index])
        void read()
      }
    } finally {
      setBusyIndex(null)
    }
  })

  const close = useMemoizedFn(() => {
    void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.closeFloat)
  })

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium">秒杀补货</span>
          <span className="text-xs text-muted-foreground">
            {pending.length > 0 ? `${pending.length} 个待补` : '暂无待补'}
          </span>
        </div>
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void read()}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-2">
        {pending.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            {goods.length === 0 ? '正在读取货架…' : '没有售罄的商品'}
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(item => (
              <div key={item.index} className="rounded-lg border px-3 py-2">
                <div className="truncate text-sm">{item.title}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {item.stock !== null ? `仅剩 ${item.stock} 件` : '已售罄'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setIgnored(prev => [...prev, item.index])}
                    >
                      忽略
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={busyIndex !== null}
                      onClick={() => void handleRestock(item.index)}
                    >
                      {busyIndex === item.index ? '补货中…' : `补货 +${config.addCount}`}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        每次 +{config.addCount} 件 · 延迟 {config.delaySeconds} 秒 · Ctrl+Shift+B
      </div>
    </div>
  )
}
