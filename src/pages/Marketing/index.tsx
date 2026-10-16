import { useId, useMemo } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { TaskButton } from '@/components/common/TaskButton'
import { Title } from '@/components/common/Title'
import { CarbonPlayFilledAlt, CarbonRenew } from '@/components/icons/carbon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAccounts } from '@/hooks/useAccounts'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useMarketing } from '@/hooks/useMarketing'
import { useCurrentMarketingLoop, useMarketingLoopActions } from '@/hooks/useMarketingLoop'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

/** 与 eos「发放优惠券」弹窗中的可选项保持一致（不含需要额外输入的「自定义」） */
const COUPON_COUNT_OPTIONS = ['10张', '50张', '100张', '500张', '1000张', '全部库存'] as const
const COUPON_DURATION_OPTIONS = ['1分钟', '3分钟', '5分钟', '10分钟'] as const

const DEFAULT_COUPON_PARAMS: SendCouponParams = {
  couponName: '',
  count: '50张',
  duration: '5分钟',
  restop: false,
}

export default function Marketing() {
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const connected = isConnected === 'connected'
  const accountId = useAccounts(state => state.currentAccountId)
  const { toast } = useToast()

  const {
    giftBags,
    coupons,
    loadingGiftBags,
    loadingCoupons,
    sending,
    refreshGiftBags,
    refreshCoupons,
    sendGiftBag,
    sendCoupon,
  } = useMarketing()

  // 循环配置（持久化，按账号分开）
  const loopConfig = useCurrentMarketingLoop(context => context.config)
  const loopRunning = useCurrentMarketingLoop(context => context.isRunning)
  const { setIsRunning, setScheduler, setMaxRuns, setGiftBag, setCoupon } =
    useMarketingLoopActions()

  // 0 表示还没选模板
  const selectedGiftBag = loopConfig.giftBag?.index ?? 0
  const couponParams = loopConfig.coupon?.params ?? DEFAULT_COUPON_PARAMS
  const selectedCoupon = couponParams.couponName
  const giftBagLoop = loopConfig.giftBag?.enabled ?? false
  const couponLoop = loopConfig.coupon?.enabled ?? false
  const maxRuns = loopConfig.maxRuns ?? 0

  const updateCouponParams = (patch: Partial<SendCouponParams>) =>
    setCoupon({ params: { ...couponParams, ...patch } })

  const selectedCouponInfo = useMemo(
    () => coupons.find(c => c.name === selectedCoupon),
    [coupons, selectedCoupon],
  )
  const needRestop = Boolean(selectedCouponInfo?.sending)

  const handleRefreshGiftBags = async () => {
    await refreshGiftBags()
  }

  const handleRefreshCoupons = async () => {
    await refreshCoupons()
  }

  const busy = sending || !connected

  const giftBagSwitchId = useId()
  const couponSwitchId = useId()

  const handleStartLoop = async () => {
    const config: MarketingLoopConfig = {
      scheduler: loopConfig.scheduler,
      maxRuns,
      giftBag: {
        enabled: giftBagLoop,
        index: selectedGiftBag > 0 ? selectedGiftBag : 1,
      },
      coupon: { enabled: couponLoop, params: couponParams },
    }

    if (!giftBagLoop && !couponLoop) {
      toast.error('请至少启用「福袋循环」或「优惠券循环」')
      return
    }
    if (giftBagLoop && selectedGiftBag < 1) {
      toast.error('请先在福袋列表里选择一个作为模板')
      return
    }
    if (couponLoop && !selectedCoupon) {
      toast.error('请先在优惠券列表里选择一个目标')
      return
    }

    const ok = await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.marketing.startLoop,
      accountId,
      config,
    )
    if (ok) {
      setIsRunning(true)
      toast.success('营销循环已启动')
    } else {
      setIsRunning(false)
      toast.error('营销循环启动失败，请查看底部日志')
    }
  }

  const handleStopLoop = async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.marketing.stopLoop, accountId)
    setIsRunning(false)
  }

  return (
    <div className="container py-8 space-y-4">
      <Title
        title="营销助手"
        description="抖音团购中控台的商品福袋与优惠券发放（需先连接直播控制台并处于直播中）"
      />

      {!connected && (
        <p className="text-sm text-muted-foreground">
          当前未连接直播控制台，请先到「打开中控台」连接抖音团购。
        </p>
      )}

      {/* ==================== 福袋 ==================== */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>福袋</CardTitle>
              <CardDescription>
                选择本场直播中的一个福袋作为模板，程序会复制它并提交审核（不改动奖品与口令，走免审规则）。
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshGiftBags}
              disabled={busy || loadingGiftBags}
            >
              <CarbonRenew className={cn('mr-2 h-4 w-4', loadingGiftBags && 'animate-spin')} />
              {loadingGiftBags ? '读取中…' : '读取列表'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {giftBags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              还没有数据，点击右上角「读取列表」从直播间拉取福袋。
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {giftBags.map(t => (
                <button
                  key={t.index}
                  type="button"
                  onClick={() => setGiftBag({ index: t.index })}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left text-sm transition-colors',
                    selectedGiftBag === t.index ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">#{t.index}</span>
                      {t.desc}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t.status} {t.sendTime}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={() => selectedGiftBag > 0 && sendGiftBag(selectedGiftBag)}
              disabled={busy || selectedGiftBag < 1}
              size="lg"
            >
              <CarbonPlayFilledAlt className="mr-2 h-4 w-4" />
              {sending ? '正在发放…' : '发放福袋'}
            </Button>
            {selectedGiftBag > 0 && (
              <span className="text-sm text-muted-foreground">已选择 #{selectedGiftBag}</span>
            )}
          </div>

          <div className="space-y-1 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id={giftBagSwitchId}
                checked={giftBagLoop}
                onCheckedChange={enabled => setGiftBag({ enabled })}
                disabled={selectedGiftBag < 1}
              />
              <Label htmlFor={giftBagSwitchId} className="cursor-pointer">
                循环发放福袋
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              每隔一个轮询间隔检查一次：<strong>只有当列表里没有「发放中」的福袋时</strong>
              ，才会复制并提交 #{selectedGiftBag || '—'}（不会改动表单里的时长，走免审）；
              提交后会把表单里的时长记下来，等它过去再检查。列表刷新后序号会变化，请重新读取确认。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ==================== 优惠券 ==================== */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>优惠券</CardTitle>
              <CardDescription>
                选择一张优惠券并设置发券数量与时长，程序会打开「发放优惠券」并确认发放。
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshCoupons}
              disabled={busy || loadingCoupons}
            >
              <CarbonRenew className={cn('mr-2 h-4 w-4', loadingCoupons && 'animate-spin')} />
              {loadingCoupons ? '读取中…' : '读取列表'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              还没有数据，点击右上角「读取列表」从直播间拉取优惠券。
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {coupons.map(c => (
                <button
                  key={c.index}
                  type="button"
                  onClick={() => updateCouponParams({ couponName: c.name })}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left text-sm transition-colors',
                    selectedCoupon === c.name ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">#{c.index}</span>
                      {c.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.amount} · 可用 {c.availableStock}/{c.totalStock} · {c.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label>发券数量</Label>
              <Select
                value={couponParams.count}
                onValueChange={count => updateCouponParams({ count })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUPON_COUNT_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>发券时长</Label>
              <Select
                value={couponParams.duration}
                onValueChange={duration => updateCouponParams({ duration })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUPON_DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={couponParams.restop ?? false}
                onChange={e => updateCouponParams({ restop: e.target.checked })}
              />
              若正在发放中，先停止再发放（仅手动发放生效）
            </label>
          </div>

          {needRestop && !couponParams.restop && (
            <p className="text-sm text-destructive">
              该券当前「发放中」，勾选上面的选项后才能重新发放。
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={() =>
                selectedCoupon &&
                sendCoupon({
                  couponName: selectedCoupon,
                  count: couponParams.count,
                  duration: couponParams.duration,
                  restop: couponParams.restop,
                })
              }
              disabled={busy || !selectedCoupon || (needRestop && !couponParams.restop)}
              size="lg"
            >
              <CarbonPlayFilledAlt className="mr-2 h-4 w-4" />
              {sending ? '正在发放…' : '发放优惠券'}
            </Button>
            {selectedCoupon && (
              <span className="text-sm text-muted-foreground">已选择「{selectedCoupon}」</span>
            )}
          </div>

          <div className="space-y-1 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id={couponSwitchId}
                checked={couponLoop}
                onCheckedChange={enabled => setCoupon({ enabled })}
                disabled={!selectedCoupon}
              />
              <Label htmlFor={couponSwitchId} className="cursor-pointer">
                循环发放优惠券
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              每隔一个轮询间隔检查一次：
              <strong>只有目标券不再「发放中」且还有可用库存时</strong>
              ，才会自动发放，用上面选的数量与时长；发放后按这个时长等待再去检查。 库存为 0
              时循环会自动结束。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ==================== 循环调度 ==================== */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>循环调度</CardTitle>
              <CardDescription>
                控制上面两个「循环发放」的节奏。任务为状态驱动：发放成功后会把当时的时长记下来，
                等这段时长过去才再去检查；只有在状态不确定时才按下面的间隔轮询。
              </CardDescription>
            </div>
            <TaskButton
              isTaskRunning={loopRunning}
              onStartStop={loopRunning ? handleStopLoop : handleStartLoop}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>轮询间隔（秒）</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={loopConfig.scheduler.interval[0] / 1000}
                onChange={e =>
                  setScheduler({
                    interval: [Number(e.target.value) * 1000, loopConfig.scheduler.interval[1]],
                  })
                }
                className="w-24"
                min="1"
                placeholder="最小"
              />
              <span className="text-sm text-muted-foreground">至</span>
              <Input
                type="number"
                value={loopConfig.scheduler.interval[1] / 1000}
                onChange={e =>
                  setScheduler({
                    interval: [loopConfig.scheduler.interval[0], Number(e.target.value) * 1000],
                  })
                }
                className="w-24"
                min="1"
                placeholder="最大"
              />
              <span className="text-sm text-muted-foreground">秒</span>
            </div>
            <p className="text-xs text-muted-foreground">
              仅在「状态不确定」时使用：在该区间内随机取一个间隔执行一轮检查。
              正常情况下任务会按已记录的发放时长自适应等待，不会频繁开合抽屉。
            </p>
          </div>

          <div className="space-y-1">
            <Label>最多执行次数</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={maxRuns}
                onChange={e => setMaxRuns(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="w-24"
                min="0"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">次（0 = 无限循环）</span>
            </div>
            <p className="text-xs text-muted-foreground">
              修改任意设置后，需要<strong>停止再重新启动</strong>任务才会生效。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
