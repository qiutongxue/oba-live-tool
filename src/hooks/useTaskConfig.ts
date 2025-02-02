import { useCallback, useEffect } from 'react'
import { useAutoMessageStore } from './useAutoMessage'
import { useAutoPopUpStore } from './useAutoPopUp'
import { useToast } from './useToast'

export function useTaskConfig() {
  const { toast } = useToast()
  const autoMessageConfig = useAutoMessageStore(state => state.config)
  const setAutoMessageConfig = useAutoMessageStore(state => state.setConfig)
  const autoPopUpConfig = useAutoPopUpStore(state => state.config)
  const setAutoPopUpConfig = useAutoPopUpStore(state => state.setConfig)
  // const { config, setConfig, originalConfig, setOriginalConfig } = useTaskConfigStore()

  const saveConfig = useCallback(async () => {
    // TODO: 添加配置验证
    // if (!configValidator(setValidationError))
    //   return
    const config = {
      autoMessage: autoMessageConfig,
      autoPopUp: autoPopUpConfig,
    }
    try {
      await window.ipcRenderer.invoke(window.ipcChannels.config.save, config)
      toast.success('配置保存成功')
    }
    catch {
      toast.error('配置保存失败')
    }
  }, [autoMessageConfig, autoPopUpConfig, toast])

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await window.ipcRenderer.invoke(window.ipcChannels.config.load)
        if (savedConfig) {
          setAutoMessageConfig(savedConfig.autoMessage)
          setAutoPopUpConfig(savedConfig.autoPopUp)
        }
      }
      catch {
        toast.error('加载配置失败')
      }
    }
    loadConfig()
  }, [toast, setAutoMessageConfig, setAutoPopUpConfig])

  return {
    saveConfig,
  }
}
