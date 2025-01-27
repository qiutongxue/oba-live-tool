import type { TaskConfig } from '@/types'
import { useEffect, useState } from 'react'
import { useToast } from './useToast'

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

export function useTaskConfig() {
  const { toast } = useToast()
  const [config, setConfig] = useState<TaskConfig>(defaultConfig)
  const [originalConfig, setOriginalConfig] = useState<TaskConfig>(config)

  const saveConfig = async () => {
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
  }

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
  }, [toast])

  return {
    config,
    setConfig,
    originalConfig,
    setOriginalConfig,
    hasChanges,
    saveConfig,
  }
}
