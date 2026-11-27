import { useCallback, useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'
import { useToast } from './useToast'

/** 默认参数：每次 +5 件，售罄后等 30 秒，每 20 秒检查一次，售罄自动弹窗 */
const DEFAULT_CONFIG: SeckillRestockConfig = {
  addCount: 5,
  delaySeconds: 30,
  checkIntervalSeconds: 20,
  floatMode: 'auto',
  // 默认自动：入口已用稳定的 seckill-btn-container 类名定位；
  // 若哪天页面又变了，可切到「我手动点开弹窗」
  manualEntry: false,
}

interface GoodsContext {
  goods: SeckillGoods[]
  /** 上次读取时间（时间戳） */
  lastReadAt: number | null
  loading: boolean
  /** 上次读取是否成功：失败时保留上一次的 goods，不能当成「货架没有售罄商品」 */
  lastReadOk: boolean | null
}

const EMPTY_GOODS: GoodsContext = { goods: [], lastReadAt: null, loading: false, lastReadOk: null }

/** 商品列表：纯内存，切页面不丢、重启重读（库存变化快，缓存没意义） */
interface GoodsStore {
  contexts: Record<string, GoodsContext>
  setGoods: (accountId: string, goods: SeckillGoods[], ok?: boolean) => void
  setReadFailed: (accountId: string) => void
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
    setGoods: (accountId, goods, ok = true) =>
      set(state => ({
        contexts: {
          ...state.contexts,
          [accountId]: { goods, lastReadAt: Date.now(), loading: false, lastReadOk: ok },
        },
      })),
    // 读取失败：保留上一次的商品列表，只把状态标成失败
    setReadFailed: accountId =>
      set(state => ({
        contexts: {
          ...state.contexts,
          [accountId]: {
            ...(state.contexts[accountId] ?? EMPTY_GOODS),
            loading: false,
            lastReadOk: false,
          },
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
    {
      name: 'seckill-config',
      version: 3,
      // v1：「补货入口」的回退值写错成 true，导致不少账号被静默存成手动模式；
      // v2：修正 manualEntry=自动；
      // v3：打开方式的旧默认是「快捷键」，而主进程的模式只在内存里，重启后
      //     实际行为与界面显示不一致（界面说自动弹出，实际一直不弹）。统一纠正为自动。
      migrate: (persisted, version) => {
        const state = persisted as { contexts?: Record<string, SeckillRestockConfig> } | undefined
        if (!state?.contexts) return state as never
        for (const key of Object.keys(state.contexts)) {
          const config = state.contexts[key]
          if (!config) continue
          if (version < 2) config.manualEntry = false
          if (version < 3) config.floatMode = 'auto'
        }
        return state as never
      },
    },
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

/** 运行时状态：模块是否在监控中（侧边栏绿点、页面开关都看它） */
interface RuntimeStore {
  contexts: Record<string, { isRunning: boolean }>
  setRunning: (accountId: string, running: boolean) => void
}

export const useSeckillRuntimeStore = create<RuntimeStore>()(set => {
  eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
    set(state => {
      const { [accountId]: _removed, ...rest } = state.contexts
      return { contexts: rest }
    })
  })

  return {
    contexts: {},
    setRunning: (accountId, running) =>
      set(state => ({
        contexts: { ...state.contexts, [accountId]: { isRunning: running } },
      })),
  }
})

export const useCurrentSeckillRunning = (): boolean => {
  const accountId = useAccounts(state => state.currentAccountId)
  return useSeckillRuntimeStore(state => state.contexts[accountId]?.isRunning ?? false)
}

/** 页面动作：读取列表 / 补货 / 导出结构 */
export function useSeckillActions() {
  const accountId = useAccounts(state => state.currentAccountId)
  const setGoods = useSeckillGoodsStore(state => state.setGoods)
  const setReadFailed = useSeckillGoodsStore(state => state.setReadFailed)
  const setLoading = useSeckillGoodsStore(state => state.setLoading)
  const setConfig = useSeckillConfigStore(state => state.setConfig)
  const { toast } = useToast()

  const read = useCallback(async () => {
    setLoading(accountId, true)
    try {
      const result = await window.ipcRenderer.invoke(IPC_CHANNELS.seckill.read, accountId)
      if (result?.ok) {
        setGoods(accountId, result.goods ?? [], true)
        return result.goods ?? []
      }
      // 读失败：保留上一次的列表，界面据此判断「这次没读到」而不是「没有售罄商品」
      setReadFailed(accountId)
      toast.error('读取货架失败，请确认已连接中控台')
      return []
    } catch {
      setReadFailed(accountId)
      toast.error('读取货架失败，请确认已连接中控台')
      return []
    }
  }, [accountId, setGoods, setReadFailed, setLoading, toast])

  const restock = useCallback(
    async (index: number, addCount: number) => {
      // ⚠️ 默认必须和 DEFAULT_CONFIG 一致（自动）。
      // 之前这里写死 `?? true`，导致**从未改过设置的账号**会静默进入手动模式：
      // 点「补货」后程序什么都不点，只在那等 180 秒，看起来就像"点不动"。
      const manualEntry =
        useSeckillConfigStore.getState().contexts[accountId]?.manualEntry ??
        DEFAULT_CONFIG.manualEntry
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

  const updateConfig = useCallback(
    (patch: Partial<SeckillRestockConfig>) => setConfig(accountId, patch),
    [accountId, setConfig],
  )

  const setRunning = useSeckillRuntimeStore(state => state.setRunning)

  /** 开启监控：每 30 秒巡一次货架，售罄按「打开方式」处理 */
  const startWatch = useCallback(() => {
    // 开监控的同时把打开方式再同步一次：主进程的模式只存在内存里，
    // 不同步就会出现「界面写自动弹出，实际售罄一声不响」
    const mode =
      useSeckillConfigStore.getState().contexts[accountId]?.floatMode ?? DEFAULT_CONFIG.floatMode
    void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.setFloatMode, accountId, mode)
    void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.start, accountId)
    setRunning(accountId, true)
  }, [accountId, setRunning])

  const stopWatch = useCallback(() => {
    void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.stop, accountId)
    setRunning(accountId, false)
  }, [accountId, setRunning])

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

  return {
    read,
    restock,
    openFloat,
    applyFloatMode,
    updateConfig,
    startWatch,
    stopWatch,
  }
}

/**
 * 把「悬浮窗打开方式」同步给主进程。
 *
 * 主进程当前模式只存在内存（应用重启回到默认），界面开关读的却是本地持久化配置。
 * 不同步就会出现「界面显示售罄自动弹出，实际售罄一声不响」。
 * 放在 App 里调用：不论当前停在哪个页面，配置一变就推给主进程。
 */
export function useSeckillFloatModeSync() {
  const accountId = useAccounts(state => state.currentAccountId)
  const mode = useSeckillConfigStore(
    state => state.contexts[accountId]?.floatMode ?? DEFAULT_CONFIG.floatMode,
  )

  useEffect(() => {
    void window.ipcRenderer.invoke(IPC_CHANNELS.seckill.setFloatMode, accountId, mode)
  }, [accountId, mode])
}

export { DEFAULT_CONFIG as SECKILL_DEFAULT_CONFIG }
