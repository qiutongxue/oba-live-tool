import { useCallback } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

/** 默认参数：每次 +5 件，售罄后等 30 秒，每 20 秒检查一次 */
const DEFAULT_CONFIG: SeckillRestockConfig = {
  addCount: 5,
  delaySeconds: 30,
  checkIntervalSeconds: 20,
  floatMode: 'shortcut',
  // 默认自动：入口已用稳定的 seckill-btn-container 类名定位；
  // 若哪天页面又变了，可切到「我手动点开弹窗」
  manualEntry: false,
}

interface GoodsContext {
  goods: SeckillGoods[]
  /** 上次读取时间（时间戳） */
  lastReadAt: number | null
  loading: boolean
}

const EMPTY_GOODS: GoodsContext = { goods: [], lastReadAt: null, loading: false }

/** 商品列表：纯内存，切页面不丢、重启重读（库存变化快，缓存没意义） */
interface GoodsStore {
  contexts: Record<string, GoodsContext>
  setGoods: (accountId: string, goods: SeckillGoods[]) => void
  setLoading: (accountId: string, loading: boolean) => void
}

export const useSeckillGoodsStore = create<GoodsStore>()(set => {
  eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
    set(state => {
      const { [accountId]: _removed, ...rest } = state.contexts
      return { contexts: rest }
    })
  })

  return {
    contexts: {},
    setGoods: (accountId, goods) =>
      set(state => ({
        contexts: {
          ...state.contexts,
          [accountId]: { goods, lastReadAt: Date.now(), loading: false },
        },
      })),
    setLoading: (accountId, loading) =>
      set(state => ({
        contexts: {
          ...state.contexts,
          [accountId]: { ...(state.contexts[accountId] ?? EMPTY_GOODS), loading },
        },
      })),
  }
})

/** 参数：持久化（补货数量和延迟是"习惯"，重启后应该保留） */
interface ConfigStore {
  contexts: Record<string, SeckillRestockConfig>
  setConfig: (accountId: string, patch: Partial<SeckillRestockConfig>) => void
}

export const useSeckillConfigStore = create<ConfigStore>()(
  persist(
    set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          const { [accountId]: _removed, ...rest } = state.contexts
          return { contexts: rest }
        })
      })

      return {
        contexts: {},
        setConfig: (accountId, patch) =>
          set(state => ({
            contexts: {
              ...state.contexts,
              [accountId]: { ...(state.contexts[accountId] ?? DEFAULT_CONFIG), ...patch },
            },
          })),
      }
    },
    { name: 'seckill-config' },
  ),
)

export const useCurrentSeckillGoods = <T>(getter: (context: GoodsContext) => T): T => {
  const accountId = useAccounts(state => state.currentAccountId)
  return useSeckillGoodsStore(useShallow(state => getter(state.contexts[accountId] ?? EMPTY_GOODS)))
}

export const useCurrentSeckillConfig = (): SeckillRestockConfig => {
  const accountId = useAccounts(state => state.currentAccountId)
  return useSeckillConfigStore(useShallow(state => state.contexts[accountId] ?? DEFAULT_CONFIG))
}

/** 页面动作：读取列表 / 补货 / 导出结构 */
export function useSeckillActions() {
  const accountId = useAccounts(state => state.currentAccountId)
  const setGoods = useSeckillGoodsStore(state => state.setGoods)
  const setLoading = useSeckillGoodsStore(state => state.setLoading)
  const setConfig = useSeckillConfigStore(state => state.setConfig)
  const { toast } = useToast()

  const read = useCallback(async () => {
    setLoading(accountId, true)
    try {
      const goods = await window.ipcRenderer.invoke(IPC_CHANNELS.seckill.read, accountId)
      setGoods(accountId, goods ?? [])
      return goods ?? []
    } catch {
      toast.error('读取货架失败，请确认已连接中控台')
      setLoading(accountId, false)
      return []
    }
  }, [accountId, setGoods, setLoading, toast])

  const restock = useCallback(
    async (index: number, addCount: number) => {
      const manualEntry = useSeckillConfigStore.getState().contexts[accountId]?.manualEntry ?? true
      const result = await window.ipcRenderer.invoke(
        IPC_CHANNELS.seckill.restock,
        accountId,
        index,
        addCount,
        manualEntry,
      )
      if (!result) {
        toast.error('补货失败，详情见底部日志')
        return null
      }
      if (result.verified) {
        toast.success(`${result.title}：投放库存 ${result.before} → ${result.next}`)
      } else {
        toast.error(`待核对：${result.message}`)
      }
      return result
    },
    [accountId, toast],
  )

  /** 录制一次真实点击（用户手动点目标元素），结果写进日志 */
  const recordClick = useCallback(async () => {
    toast.success('已开始录制：请到页面上点一次目标元素（90 秒内有效）')
    const text = await window.ipcRenderer.invoke(IPC_CHANNELS.seckill.recordClick, accountId)
    if (text) toast.success('录制完成，结果已写入日志')
    else toast.error('录制失败或超时，详见日志')
    return text
  }, [accountId, toast])

  const dump = useCallback(async () => {
    const text = await window.ipcRenderer.invoke(IPC_CHANNELS.seckill.dump, accountId)
    if (text) toast.success('页面结构已写入日志，可复制给开发者排查')
    else toast.error('导出失败，请确认已连接中控台')
  }, [accountId, toast])

  const updateConfig = useCallback(
    (patch: Partial<SeckillRestockConfig>) => setConfig(accountId, patch),
    [accountId, setConfig],
  )

  const openFloat = useCallback(() => {
    void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.openFloat)
  }, [])

  const applyFloatMode = useCallback(
    (mode: SeckillFloatMode) => {
      setConfig(accountId, { floatMode: mode })
      void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.setFloatMode, accountId, mode)
    },
    [accountId, setConfig],
  )

  return { read, restock, dump, recordClick, openFloat, applyFloatMode, updateConfig }
}

export { DEFAULT_CONFIG as SECKILL_DEFAULT_CONFIG }
