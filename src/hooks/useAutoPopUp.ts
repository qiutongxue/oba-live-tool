import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useToast } from './useToast'

interface AutoPopUpConfig {
  scheduler: {
    interval: [number, number]
  }
  goodsIds: number[]
  random: boolean
}

const defaultConfig: AutoPopUpConfig = {
  scheduler: {
    interval: [30000, 45000],
  },
  goodsIds: [],
  random: false,
}

interface AutoPopUpStore {
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  config: AutoPopUpConfig
  setConfig: (config: AutoPopUpConfig) => void
  setScheduler: (scheduler: AutoPopUpConfig['scheduler']) => void
  setGoodsIds: (goodsIds: AutoPopUpConfig['goodsIds']) => void
  setRandom: (random: AutoPopUpConfig['random']) => void
}

export const useAutoPopUpStore = create<AutoPopUpStore>()(
  persist(
    immer((set) => {
      return {
        isRunning: false,
        setIsRunning: running => set((draft) => { draft.isRunning = running }),
        config: defaultConfig,
        setConfig: config => set((draft) => {
          draft.config = config
        }),
        setScheduler: scheduler => set((draft) => { draft.config.scheduler = scheduler }),
        setGoodsIds: goodsIds => set((draft) => { draft.config.goodsIds = goodsIds }),
        setRandom: random => set((draft) => { draft.config.random = random }),
      }
    }),
    {
      name: 'auto-popup-storage',
      partialize: state => ({
        config: state.config,
      }),
    },
  ),
)

export function useAutoPopUp() {
  const store = useAutoPopUpStore()
  const { toast } = useToast()

  useEffect(() => {
    const handleTaskStop = () => {
      store.setIsRunning(false)
      toast.error('自动弹窗已停止')
    }

    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.tasks.autoPopUp.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [store, toast])

  return {
    store,
  }
}
