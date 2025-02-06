import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useTaskConfig } from './useTaskConfig'
import { useToast } from './useToast'

export interface AutoMessageConfig {
  enabled: boolean
  scheduler: {
    interval: [number, number] // [最小间隔, 最大间隔]
  }
  messages: string[]
  pinTops: number[] // 需要置顶的消息索引
  random: boolean
}

const defaultConfig: AutoMessageConfig = {
  enabled: false,
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
  originalConfig: AutoMessageConfig
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  setScheduler: (scheduler: AutoMessageConfig['scheduler']) => void
  setMessages: (messages: AutoMessageConfig['messages']) => void
  setPinTops: (pinTops: AutoMessageConfig['pinTops']) => void
  setRandom: (random: AutoMessageConfig['random']) => void
  setEnabled: (enabled: AutoMessageConfig['enabled']) => void
}

export const useAutoMessageStore = create<AutoMessageStore>()(immer((set) => {
  return {
    config: defaultConfig,
    originalConfig: defaultConfig,
    isRunning: false,
    setConfig: config => set((draft) => {
      draft.config = config
      draft.originalConfig = config
    }),
    setIsRunning: running => set((draft) => { draft.isRunning = running }),
    setScheduler: scheduler => set((draft) => { draft.config.scheduler = scheduler }),
    setMessages: messages => set((draft) => { draft.config.messages = messages }),
    setPinTops: pinTops => set((draft) => { draft.config.pinTops = pinTops }),
    setRandom: random => set((draft) => { draft.config.random = random }),
    setEnabled: enabled => set((draft) => { draft.config.enabled = enabled }),
  }
}))

export function useAutoMessage() {
  const store = useAutoMessageStore()
  const { saveConfig } = useTaskConfig()
  const { toast } = useToast()

  const hasChanges = () => {
    return JSON.stringify(store.config) !== JSON.stringify(store.originalConfig)
  }
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
    hasChanges,
    saveConfig: async () => {
      store.setConfig(store.config)
      await saveConfig()
    },
    store,
  }
}
