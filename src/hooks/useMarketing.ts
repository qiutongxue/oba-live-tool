import { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/useToast'

/**
 * 抖音团购「营销助手」：福袋 / 优惠券 的读取与发放。
 */
export function useMarketing() {
  const accountId = useAccounts(s => s.currentAccountId)
  const { toast } = useToast()

  const [giftBags, setGiftBags] = useState<GiftBagTemplate[]>([])
  const [coupons, setCoupons] = useState<CouponInfo[]>([])
  const [loadingGiftBags, setLoadingGiftBags] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [sending, setSending] = useState(false)

  const refreshGiftBags = useCallback(async () => {
    setLoadingGiftBags(true)
    try {
      const list = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.marketing.getGiftBagTemplates,
        accountId,
      )
      setGiftBags(list ?? [])
      if (!list || list.length === 0) {
        toast.error('未读取到福袋，请确认已连接中控台且正在直播')
      }
    } catch {
      toast.error('读取福袋列表出错')
    } finally {
      setLoadingGiftBags(false)
    }
  }, [accountId, toast])

  const refreshCoupons = useCallback(async () => {
    setLoadingCoupons(true)
    try {
      const list = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.marketing.getCoupons,
        accountId,
      )
      setCoupons(list ?? [])
      if (!list || list.length === 0) {
        toast.error('未读取到优惠券，请确认已连接中控台且正在直播')
      }
    } catch {
      toast.error('读取优惠券列表出错')
    } finally {
      setLoadingCoupons(false)
    }
  }, [accountId, toast])

  const sendGiftBag = useCallback(
    async (index: number) => {
      setSending(true)
      try {
        const ok = await window.ipcRenderer.invoke(
          IPC_CHANNELS.tasks.marketing.sendGiftBag,
          accountId,
          { index },
        )
        if (ok) toast.success('福袋已提交，请稍后在列表确认状态')
        else toast.error('发放福袋失败，请查看底部日志')
        return ok
      } catch {
        toast.error('发放福袋出错')
        return false
      } finally {
        setSending(false)
      }
    },
    [accountId, toast],
  )

  const sendCoupon = useCallback(
    async (params: SendCouponParams) => {
      setSending(true)
      try {
        const ok = await window.ipcRenderer.invoke(
          IPC_CHANNELS.tasks.marketing.sendCoupon,
          accountId,
          params,
        )
        if (ok) toast.success('优惠券已发放')
        else toast.error('发放优惠券失败，请查看底部日志')
        return ok
      } catch {
        toast.error('发放优惠券出错')
        return false
      } finally {
        setSending(false)
      }
    },
    [accountId, toast],
  )

  return {
    giftBags,
    coupons,
    loadingGiftBags,
    loadingCoupons,
    sending,
    refreshGiftBags,
    refreshCoupons,
    sendGiftBag,
    sendCoupon,
  }
}
