import { useEffect } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useTaskConfig } from './useTaskConfig'
import { useToast } from './useToast'

interface AutoPopUpConfig {
  enabled: boolean
  scheduler: {
    interval: [number, number]
  }
  goodsIds: number[]
  random: boolean
}

const defaultConfig: AutoPopUpConfig = {
  enabled: false,
  scheduler: {
    interval: [30000, 45000],
  },
  goodsIds: [],
  random: true,
}

interface AutoPopUpStore {
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  config: AutoPopUpConfig
  originalConfig: AutoPopUpConfig
  setConfig: (config: AutoPopUpConfig) => void
  setEnabled: (enabled: boolean) => void
  setScheduler: (scheduler: AutoPopUpConfig['scheduler']) => void
  setGoodsIds: (goodsIds: AutoPopUpConfig['goodsIds']) => void
  setRandom: (random: AutoPopUpConfig['random']) => void
}

export const useAutoPopUpStore = create<AutoPopUpStore>()(immer((set) => {
  return {
    isRunning: false,
    setIsRunning: running => set((draft) => { draft.isRunning = running }),
    config: defaultConfig,
    originalConfig: defaultConfig,
    setConfig: config => set((draft) => {
      draft.config = config
      draft.originalConfig = config
    }),
    setEnabled: enabled => set((draft) => { draft.config.enabled = enabled }),
    setScheduler: scheduler => set((draft) => { draft.config.scheduler = scheduler }),
    setGoodsIds: goodsIds => set((draft) => { draft.config.goodsIds = goodsIds }),
    setRandom: random => set((draft) => { draft.config.random = random }),
  }
}))

export function useAutoPopUp() {
  const store = useAutoPopUpStore()
  const { toast } = useToast()
  const { saveConfig } = useTaskConfig()

  useEffect(() => {
    const handleTaskStop = () => {
      store.setIsRunning(false)
      toast.error('自动弹窗已停止')
    }

    const removeListener = window.ipcRenderer.on(window.ipcChannels.tasks.autoPopUp.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [store, toast])

  const hasChanges = () => {
    return JSON.stringify(store.config) !== JSON.stringify(store.originalConfig)
  }

  return {
    store,
    saveConfig: async () => {
      store.setConfig(store.config)
      await saveConfig()
    },
    hasChanges,
  }
}
