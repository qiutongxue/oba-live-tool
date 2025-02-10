import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useToast } from './useToast'

export interface AutoMessageConfig {
  scheduler: {
    interval: [number, number] // [最小间隔, 最大间隔]
  }
  messages: string[]
  pinTops: number[] // 需要置顶的消息索引
  random: boolean
}

const defaultConfig: AutoMessageConfig = {
  scheduler: {
    interval: [30000, 60000],
  },
  messages: [],
  pinTops: [],
  random: false,
}

interface AutoMessageStore {
  config: AutoMessageConfig
  setConfig: (config: AutoMessageConfig) => void
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  setScheduler: (scheduler: AutoMessageConfig['scheduler']) => void
  setMessages: (messages: AutoMessageConfig['messages']) => void
  setPinTops: (pinTops: AutoMessageConfig['pinTops']) => void
  setRandom: (random: AutoMessageConfig['random']) => void
}

export const useAutoMessageStore = create<AutoMessageStore>()(
  persist(
    immer((set) => {
      return {
        config: defaultConfig,
        isRunning: false,
        setConfig: config => set((draft) => {
          draft.config = config
        }),
        setIsRunning: running => set((draft) => { draft.isRunning = running }),
        setScheduler: scheduler => set((draft) => { draft.config.scheduler = scheduler }),
        setMessages: messages => set((draft) => { draft.config.messages = messages }),
        setPinTops: pinTops => set((draft) => { draft.config.pinTops = pinTops }),
        setRandom: random => set((draft) => { draft.config.random = random }),
      }
    }),
    {
      name: 'auto-message-storage',
      partialize: state => ({
        config: state.config,
        originalConfig: state.config,
      }),
    },
  ),
)

export function useAutoMessage() {
  const store = useAutoMessageStore()
  const { toast } = useToast()

  useEffect(() => {
    const handleTaskStop = () => {
      store.setIsRunning(false)
      toast.error('自动消息已停止')
    }
    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.tasks.autoMessage.stop, handleTaskStop)
    return () => {
      removeListener()
    }
  }, [store, toast])
  return {
    store,
  }
}
