import { useEffect } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { providers as defaultProviders } from 'shared/providers'
import { create } from 'zustand'
import { createSelectors } from '@/utils/zustand'

interface ProvidersState {
  /** 当前 providers 数据（初始为内置默认值，异步从主进程获取后更新） */
  providers: Record<string, ProviderInfo>
  /** 是否已尝试从主进程加载 */
  loaded: boolean
}

const useProvidersStoreBase = create<ProvidersState>(() => ({
  providers: { ...defaultProviders },
  loaded: false,
}))

export const useProvidersStore = createSelectors(useProvidersStoreBase)

/** 获取当前 providers 数据。应用启动时自动从主进程加载最新数据。 */
export function useProviders(): Record<string, ProviderInfo> {
  const { providers, loaded } = useProvidersStore()
  const store = useProvidersStore

  useEffect(() => {
    if (loaded) return

    // 从主进程获取 providers（可能是缓存或 GitHub 返回的最新数据）
    window.ipcRenderer.invoke(IPC_CHANNELS.app.getProviders).then(data => {
      if (data) {
        store.setState({ providers: data, loaded: true })
      }
    })
  }, [loaded])

  // 监听主进程主动推送的 providers 更新（GitHub 获取完成后推送）
  useEffect(() => {
    const unsubscribe = window.ipcRenderer.on(
      IPC_CHANNELS.app.providersUpdated,
      (data: Record<string, ProviderInfo>) => {
        if (data) {
          store.setState({ providers: data })
        }
      },
    )
    return unsubscribe
  }, [])

  return providers
}
