import { useMemoizedFn } from 'ahooks'
import { RefreshCw, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Button } from '@/components/ui/button'
import { useAccounts } from '@/hooks/useAccounts'
import {
  useCurrentSeckillConfig,
  useCurrentSeckillGoods,
  useSeckillActions,
  useSeckillGoodsStore,
} from '@/hooks/useSeckill'
import { cn } from '@/lib/utils'

/**
 * 秒杀补货悬浮窗（独立窗口，`#/seckill-float`）。
 *
 * 只回答一个问题：**哪个商品需要补货**。所以这里不显示价格、不看库存明细，
 * 只有「商品名 + 补货按钮 + 忽略」。
 *
 * 数据来源：主进程巡检到售罄时，会把**触发这次弹窗的那份货架**一起推过来
 * （`floatShownEvent`），之后每轮巡检再推 `floatGoodsEvent` 保持同步。
 * 页面自己只在补货完成后刷新一次，避免「弹出来时页面另读一遍读到空列表 → 立刻被判成没待补」。
 */
export default function SeckillFloat() {
  const accountId = useAccounts(state => state.currentAccountId)
  const goods = useCurrentSeckillGoods(context => context.goods)
  const loading = useCurrentSeckillGoods(context => context.loading)
  const lastReadOk = useCurrentSeckillGoods(context => context.lastReadOk)
  const setGoods = useSeckillGoodsStore(state => state.setGoods)
  const config = useCurrentSeckillConfig()
  const { read, restock } = useSeckillActions()

  /** 已忽略的商品（本次打开期间不再提示） */
  const [ignored, setIgnored] = useState<number[]>([])
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  /** 浮窗没有 Toaster，失败原因要就地显示，否则什么都看不到 */
  const [status, setStatus] = useState<string>('')
  /** 拿到过货架数据（来自主进程推送或自己读取）才允许按待补数量决定关不关窗 */
  const [loaded, setLoaded] = useState(false)
  /** 这次打开期间是否真的出现过待补商品：没见过就说明货架没读出来，0 不能当成补完了 */
  const sawPending = useRef(false)
  /** 是否已经收到主进程推送的货架（收到就不用自己再读一遍） */
  const gotPushed = useRef(false)

  const headerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  // 兜底：1.5 秒内没收到主进程推送（手动打开窗口的情况）就自己读一次
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gotPushed.current) return
      void read().then(() => setLoaded(true))
    }, 1500)
    return () => clearTimeout(timer)
  }, [read])

  // 主进程推来货架：直接用它渲染，不再自己读，保证窗口内容和触发条件一致
  useEffect(() => {
    return window.ipcRenderer.on(IPC_CHANNELS.seckill.floatShownEvent, ({ goods: pushed }) => {
      gotPushed.current = true
      setIgnored([])
      setStatus('')
      sawPending.current = false
      if (pushed.length > 0) {
        setGoods(accountId, pushed, true)
        setLoaded(true)
      } else {
        void read().then(() => setLoaded(true))
      }
    })
  }, [accountId, read, setGoods])

  // 窗口开着期间，每轮巡检把最新货架推过来
  useEffect(() => {
    return window.ipcRenderer.on(IPC_CHANNELS.seckill.floatGoodsEvent, ({ goods: pushed }) => {
      setGoods(accountId, pushed, true)
      setLoaded(true)
    })
  }, [accountId, setGoods])

  // 读失败后每 3 秒重试一次，直到成功（失败期间绝不触发「补完了」的判定）
  useEffect(() => {
    if (lastReadOk !== false) return
    const timer = setInterval(() => {
      void read()
    }, 3000)
    return () => clearInterval(timer)
  }, [lastReadOk, read])

  const pending = useMemo(
    () => goods.filter(item => item.soldOut && !ignored.includes(item.index)),
    [goods, ignored],
  )

  const handleRestock = useMemoizedFn(async (index: number) => {
    setBusyIndex(index)
    try {
      setStatus('')
      const result = await restock(index, config.addCount)
      if (result?.verified || result?.closed) {
        setIgnored(prev => [...prev, index])
        setStatus(result.message)
        void read()
      } else if (result) {
        setStatus(result.message)
      } else {
        setStatus('补货失败，点「打开主界面 → 秒杀补货」看日志')
      }
    } finally {
      setBusyIndex(null)
    }
  })

  // 内容多高窗口就多高：标题 + N 个商品卡片 + 底部一行
  // 用 ResizeObserver 监听内容高度变化（比依赖列表长度更准，状态文字换行也能触发）
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return

    const apply = () => {
      const header = headerRef.current?.offsetHeight ?? 0
      const footer = footerRef.current?.offsetHeight ?? 0
      const content = el.getBoundingClientRect().height
      if (content === 0) return
      void window.ipcRenderer.invoke(
        IPC_CHANNELS.seckill.setFloatHeight,
        header + content + 12 + footer,
      )
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 待补清零 → 主进程会把自动弹出的窗口关掉。
  // 上报时带上「这次货架读成功没有」：读取失败时空列表不能当成补完了。
  useEffect(() => {
    if (!loaded || lastReadOk === null) return
    if (pending.length > 0) sawPending.current = true
    void window.ipcRenderer.invoke(
      IPC_CHANNELS.seckill.reportFloatCount,
      pending.length,
      lastReadOk,
    )
  }, [loaded, lastReadOk, pending.length])

  const close = useMemoizedFn(() => {
    void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.closeFloat)
  })

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div
        ref={headerRef}
        className="flex items-center justify-between border-b px-2.5 py-1.5"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="text-[12px] font-medium">秒杀补货</span>
          <span className="truncate text-[10px] text-muted-foreground">
            {pending.length > 0 ? `${pending.length} 个待补` : '暂无待补'}
          </span>
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void read()}>
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={close}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto px-2 py-1.5">
        <div ref={contentRef}>
          {pending.length === 0 ? (
            <div className="py-5 text-center text-[11px] text-muted-foreground">
              {lastReadOk === false
                ? '货架读取失败，正在重试…'
                : goods.length === 0
                  ? '正在读取货架…'
                  : '没有售罄的商品'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {pending.map(item => (
                <div key={item.index} className="rounded-md border px-2 py-1.5">
                  <div className="truncate text-[12px] leading-4">{item.title}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {item.stock !== null ? `仅剩 ${item.stock} 件` : '已售罄'}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[11px]"
                        onClick={() => setIgnored(prev => [...prev, item.index])}
                      >
                        忽略
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[11px]"
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
      </div>

      <div
        ref={footerRef}
        className="border-t px-2 py-1 text-[10px] leading-4 text-muted-foreground"
      >
        {status ? <div className="mb-0.5 text-foreground">{status}</div> : null}
        {lastReadOk === false ? (
          <div className="mb-0.5 text-amber-500">货架读取失败，正在重试…</div>
        ) : null}
        每次 +{config.addCount} 件 · 延迟 {config.delaySeconds} 秒
        {config.manualEntry ? ' · 手动模式' : ' · Ctrl+Shift+B'}
      </div>
    </div>
  )
}
