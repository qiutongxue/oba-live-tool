import { useMemoizedFn } from 'ahooks'
import { useMemo, useRef } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useShallow } from 'zustand/react/shallow'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'

/**
 * 营销助手「循环发放」的配置与运行状态（按账号分开存）。
 * 结构与 useAutoPopUp 一致，便于复用 TaskButton / useTaskControl 的交互习惯。
 */
interface MarketingLoopContext {
  isRunning: boolean
  config: MarketingLoopConfig
}

const defaultContext = (): MarketingLoopContext => ({
  isRunning: false,
  config: {
    scheduler: { interval: [30000, 45000] },
    maxRuns: 0,
    giftBag: { enabled: false, index: 0 },
    coupon: {
      enabled: false,
      params: { couponName: '', count: '50张', duration: '5分钟', restop: false },
    },
  },
})

interface MarketingLoopStore {
  contexts: Record<string, MarketingLoopContext>
  setIsRunning: (accountId: string, running: boolean) => void
  setConfig: (accountId: string, config: Partial<MarketingLoopConfig>) => void
}

export const useMarketingLoopStore = create<MarketingLoopStore>()(
  persist(
    immer(set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          delete state.contexts[accountId]
        })
      })

      const ensureContext = (state: MarketingLoopStore, accountId: string) => {
        if (!state.contexts[accountId]) {
          state.contexts[accountId] = defaultContext()
        }
        return state.contexts[accountId]
      }

      return {
        contexts: { default: defaultContext() },
        setIsRunning: (accountId, running) =>
          set(state => {
            ensureContext(state, accountId).isRunning = running
          }),
        setConfig: (accountId, config) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.config = { ...context.config, ...config }
          }),
      }
    }),
    {
      name: 'marketing-loop-storage',
      version: 1,
      partialize: state => ({
        contexts: Object.fromEntries(
          Object.entries(state.contexts).map(([accountId, context]) => [
            accountId,
            Object.fromEntries(Object.entries(context).filter(([key]) => key !== 'isRunning')),
          ]),
        ),
      }),
    },
  ),
)

export const useMarketingLoopActions = () => {
  const setIsRunning = useMarketingLoopStore(state => state.setIsRunning)
  const setConfig = useMarketingLoopStore(state => state.setConfig)
  const currentAccountId = useAccounts(state => state.currentAccountId)

  const updateConfig = useMemoizedFn((newConfig: Partial<MarketingLoopConfig>) => {
    setConfig(currentAccountId, newConfig)
  })

  const getGiftBag = useMemoizedFn(() => {
    return useMarketingLoopStore.getState().contexts[currentAccountId]?.config.giftBag
  })

  const getCoupon = useMemoizedFn(() => {
    return useMarketingLoopStore.getState().contexts[currentAccountId]?.config.coupon
  })

  return useMemo(
    () => ({
      setIsRunning: (running: boolean) => setIsRunning(currentAccountId, running),
      setScheduler: (scheduler: MarketingLoopConfig['scheduler']) => updateConfig({ scheduler }),
      setMaxRuns: (maxRuns: number) => updateConfig({ maxRuns }),
      setGiftBag: (patch: Partial<NonNullable<MarketingLoopConfig['giftBag']>>) => {
        const current = getGiftBag()
        updateConfig({ giftBag: { enabled: false, index: 1, ...current, ...patch } })
      },
      setCoupon: (patch: Partial<NonNullable<MarketingLoopConfig['coupon']>>) => {
        const current = getCoupon()
        updateConfig({
          coupon: {
            enabled: false,
            params: { couponName: '', count: '50张', duration: '5分钟', restop: false },
            ...current,
            ...patch,
          },
        })
      },
    }),
    [currentAccountId, setIsRunning, updateConfig, getGiftBag, getCoupon],
  )
}

export const useCurrentMarketingLoop = <T>(getter: (context: MarketingLoopContext) => T): T => {
  const currentAccountId = useAccounts(state => state.currentAccountId)
  const defaultContextRef = useRef(defaultContext())
  return useMarketingLoopStore(
    useShallow(state => {
      const context = state.contexts[currentAccountId] ?? defaultContextRef.current
      return getter(context)
    }),
  )
}
