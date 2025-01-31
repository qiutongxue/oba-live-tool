import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { useToast } from './useToast'

export interface TaskConfig {
  autoMessage: {
    enabled: boolean
    scheduler: {
      interval: [number, number] // [最小间隔, 最大间隔]
    }
    messages: string[]
    pinTops: number[] // 需要置顶的消息索引
    random: boolean
  }
  autoPopUp: {
    enabled: boolean
    scheduler: {
      interval: [number, number]
    }
    goodsIds: number[]
    random: boolean
  }
}

const defaultConfig: TaskConfig = {
  autoMessage: {
    enabled: false,
    scheduler: {
      interval: [30000, 60000],
    },
    messages: [],
    pinTops: [],
    random: true,
  },
  autoPopUp: {
    enabled: false,
    scheduler: {
      interval: [30000, 45000],
    },
    goodsIds: [],
    random: true,
  },
}

interface TaskConfigStore {
  config: TaskConfig
  setConfig: (updater: TaskConfig | ((prevConfig: TaskConfig) => TaskConfig)) => void
  originalConfig: TaskConfig
  setOriginalConfig: (config: TaskConfig) => void
}

const useTaskConfigStore = create<TaskConfigStore>((set) => {
  return {
    config: defaultConfig,
    setConfig: (updater: TaskConfig | ((prevConfig: TaskConfig) => TaskConfig)) => {
      if (typeof updater === 'function') {
        set(state => ({ config: updater(state.config) }))
      }
      else {
        set({ config: updater })
      }
    },
    originalConfig: defaultConfig,
    setOriginalConfig: (config: TaskConfig) => set({ originalConfig: config }),
  }
})

export function useTaskConfig() {
  const { toast } = useToast()
  const { config, setConfig, originalConfig, setOriginalConfig } = useTaskConfigStore()

  const saveConfig = useCallback(async () => {
    // TODO: 添加配置验证
    // if (!configValidator(setValidationError))
    //   return

    try {
      await window.ipcRenderer.invoke(window.ipcChannels.config.save, config)
      setOriginalConfig(config)
      toast.success('配置保存成功')
    }
    catch {
      toast.error('配置保存失败')
    }
  }, [config, setOriginalConfig, toast])

  const hasChanges = (): boolean => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig)
  }

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await window.ipcRenderer.invoke(window.ipcChannels.config.load)
        if (savedConfig) {
          setConfig(savedConfig)
          setOriginalConfig(savedConfig)
        }
      }
      catch {
        toast.error('加载配置失败')
      }
    }
    loadConfig()
  }, [toast, setConfig, setOriginalConfig])

  return {
    config,
    setConfig,
    originalConfig,
    setOriginalConfig,
    hasChanges,
    saveConfig,
  }
}
