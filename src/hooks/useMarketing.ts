import { useCallback } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

/**
 * 抖音团购「营销助手」：福袋 / 优惠券 的读取与发放。
 *
 * 列表数据放在 **zustand store**（按账号分开存），而不是组件内的 useState，
 * 这样切到别的页面再回来时列表还在，不需要反复重新读取。
 * 只有显式点击「读取列表」时才会清空并重新录入。
 */

/** 一个账号下的营销列表快照 */
interface MarketingLists {
  giftBags: GiftBagTemplate[]
  coupons: CouponInfo[]
  /** 上次成功读取的时间戳；null = 本次运行还没读过 */
  giftBagsUpdatedAt: number | null
  couponsUpdatedAt: number | null
  loadingGiftBags: boolean
  loadingCoupons: boolean
  /** 是否有发放动作正在执行（跨页面保留，避免切回来后按钮状态错乱） */
  sending: boolean
}

const createEmptyLists = (): MarketingLists => ({
  giftBags: [],
  coupons: [],
  giftBagsUpdatedAt: null,
  couponsUpdatedAt: null,
  loadingGiftBags: false,
  loadingCoupons: false,
  sending: false,
})

/** 找不到账号对应数据时的稳定引用，避免 useShallow 每次拿到新对象导致重复渲染 */
const EMPTY_LISTS: MarketingLists = createEmptyLists()

type RefreshResult = { ok: boolean; count: number }

interface MarketingStore {
  lists: Record<string, MarketingLists>
  refreshGiftBags: (accountId: string) => Promise<RefreshResult>
  refreshCoupons: (accountId: string) => Promise<RefreshResult>
  /** 成功返回发放结果（含是否确认到新增），失败返回 null */
  sendGiftBag: (accountId: string, index: number) => Promise<SendGiftBagResult | null>
  sendCoupon: (accountId: string, params: SendCouponParams) => Promise<boolean>
}

export const useMarketingStore = create<MarketingStore>()((set, get) => {
  eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
    set(state => {
      const { [accountId]: _removed, ...rest } = state.lists
      return { lists: rest }
    })
  })

  /** 局部更新某个账号的数据 */
  const patch = (accountId: string, updater: (lists: MarketingLists) => MarketingLists) => {
    set(state => ({
      lists: {
        ...state.lists,
        [accountId]: updater(state.lists[accountId] ?? createEmptyLists()),
      },
    }))
  }

  return {
    lists: {},

    refreshGiftBags: async accountId => {
      const previous = get().lists[accountId]?.giftBags ?? []
      // 用户明确要求：只有「重新读取」时才清空并重新录入
      patch(accountId, lists => ({ ...lists, giftBags: [], loadingGiftBags: true }))
      try {
        const list = await window.ipcRenderer.invoke(
          IPC_CHANNELS.tasks.marketing.getGiftBagTemplates,
          accountId,
        )
        const data: GiftBagTemplate[] = list ?? []
        patch(accountId, lists => ({
          ...lists,
          giftBags: data,
          giftBagsUpdatedAt: Date.now(),
          loadingGiftBags: false,
        }))
        return { ok: data.length > 0, count: data.length }
      } catch {
        // 读取失败时把旧列表还回去，别让用户手里什么都没了
        patch(accountId, lists => ({ ...lists, giftBags: previous, loadingGiftBags: false }))
        return { ok: false, count: previous.length }
      }
    },

    refreshCoupons: async accountId => {
      const previous = get().lists[accountId]?.coupons ?? []
      patch(accountId, lists => ({ ...lists, coupons: [], loadingCoupons: true }))
      try {
        const list = await window.ipcRenderer.invoke(
          IPC_CHANNELS.tasks.marketing.getCoupons,
          accountId,
        )
        const data: CouponInfo[] = list ?? []
        patch(accountId, lists => ({
          ...lists,
          coupons: data,
          couponsUpdatedAt: Date.now(),
          loadingCoupons: false,
        }))
        return { ok: data.length > 0, count: data.length }
      } catch {
        patch(accountId, lists => ({ ...lists, coupons: previous, loadingCoupons: false }))
        return { ok: false, count: previous.length }
      }
    },

    sendGiftBag: async (accountId, index) => {
      patch(accountId, lists => ({ ...lists, sending: true }))
      try {
        const result = await window.ipcRenderer.invoke(
          IPC_CHANNELS.tasks.marketing.sendGiftBag,
          accountId,
          { index },
        )
        return (result ?? null) as SendGiftBagResult | null
      } catch {
        return null
      } finally {
        patch(accountId, lists => ({ ...lists, sending: false }))
      }
    },

    sendCoupon: async (accountId, params) => {
      patch(accountId, lists => ({ ...lists, sending: true }))
      try {
        const ok = await window.ipcRenderer.invoke(
          IPC_CHANNELS.tasks.marketing.sendCoupon,
          accountId,
          params,
        )
        return Boolean(ok)
      } catch {
        return false
      } finally {
        patch(accountId, lists => ({ ...lists, sending: false }))
      }
    },
  }
})

/**
 * 组件侧入口：读取当前账号的列表快照 + 包一层 toast。
 * 返回结构与改造前保持一致，页面代码基本不用动。
 */
export function useMarketing() {
  const accountId = useAccounts(s => s.currentAccountId)
  const { toast } = useToast()

  const {
    giftBags,
    coupons,
    giftBagsUpdatedAt,
    couponsUpdatedAt,
    loadingGiftBags,
    loadingCoupons,
    sending,
  } = useMarketingStore(useShallow(state => state.lists[accountId] ?? EMPTY_LISTS))

  const refreshGiftBags = useCallback(async () => {
    const { ok, count } = await useMarketingStore.getState().refreshGiftBags(accountId)
    if (!ok) {
      toast.error(
        count === 0
          ? '未读取到福袋，请确认已连接中控台且正在直播'
          : '读取福袋列表出错，已保留上次的数据',
      )
    }
    return ok
  }, [accountId, toast])

  const refreshCoupons = useCallback(async () => {
    const { ok, count } = await useMarketingStore.getState().refreshCoupons(accountId)
    if (!ok) {
      toast.error(
        count === 0
          ? '未读取到优惠券，请确认已连接中控台且正在直播'
          : '读取优惠券列表出错，已保留上次的数据',
      )
    }
    return ok
  }, [accountId, toast])

  const sendGiftBag = useCallback(
    async (index: number) => {
      const result = await useMarketingStore.getState().sendGiftBag(accountId, index)
      if (!result) {
        toast.error('发放福袋失败，请查看底部日志')
      } else if (result.verified) {
        toast.success('福袋已发放，列表已确认新增')
      } else {
        // 提交动作完成，但列表没确认到新增 —— 不谎报成功，提示用户核对
        toast.error('福袋已提交，但列表里没看到新增，请点「读取列表」核对')
      }
      return result !== null
    },
    [accountId, toast],
  )

  const sendCoupon = useCallback(
    async (params: SendCouponParams) => {
      const ok = await useMarketingStore.getState().sendCoupon(accountId, params)
      if (ok) toast.success('优惠券已发放')
      else toast.error('发放优惠券失败，请查看底部日志')
      return ok
    },
    [accountId, toast],
  )

  return {
    giftBags,
    coupons,
    giftBagsUpdatedAt,
    couponsUpdatedAt,
    loadingGiftBags,
    loadingCoupons,
    sending,
    refreshGiftBags,
    refreshCoupons,
    sendGiftBag,
    sendCoupon,
  }
}
