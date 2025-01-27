import type { TaskConfig } from '../types'
import { useEffect, useState } from 'react'

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
  const [config, setConfig] = useState<TaskConfig>(defaultConfig)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await window.ipcRenderer.invoke('load-task-config')
        if (savedConfig)
          setConfig(savedConfig)
      }
      catch (error) {
        console.error('加载配置失败:', error)
      }
    }
    loadConfig()
  }, [])

  return { config, setConfig }
}
