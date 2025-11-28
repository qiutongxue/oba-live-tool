import { useCallback, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createSelectors } from '@/utils/zustand'
import { useIpcListener } from './useIpc'

export type UpdateStatus =
  | 'idle' // 空闲
  | 'checking' // 通过 CDN 简单检查最新版本号
  | 'available' // 有可用更新 (已获取到信息，等待用户确认)
  | 'preparing' // 用户点击更新后，正在请求 Electron-Updater 确认链接
  | 'downloading' // 正在下载
  | 'ready' // 下载完成，等待重启
  | 'error' // 发生错误

export interface VersionState {
  currentVersion: string
  latestVersion: string
  releaseNote?: string
}

interface UpdateState {
  status: UpdateStatus
  versionInfo: VersionState | null
  progress: number
  error: ErrorType | null
  source: string
}

interface UpdateAction {
  checkUpdateManually: () => Promise<{ upToDate: boolean } | undefined>
  startDownload: (source: string) => void
  installUpdate: () => void
  setProgress: (progress: number) => void
  setStatus: (status: UpdateStatus) => void
  reset: () => void
  handleError: (error: ErrorType) => void
  handleUpdate: (info: VersionState) => void
  setSource: (source: string) => void
}

type UpdateStore = UpdateState & UpdateAction

const useUpdateStoreBase = create<UpdateStore>()((set, get) => ({
  status: 'idle',
  versionInfo: null,
  progress: 0,
  error: null,
  source: 'github',

  checkUpdateManually: async () => {
    set({ status: 'checking', error: null })
    try {
      // 这里只获取信息，不触发 electron-updater
      const result = await window.ipcRenderer.invoke(IPC_CHANNELS.updater.checkUpdate)
      if (result) {
        set({ status: 'available', versionInfo: result })
      } else {
        set({ status: 'idle' })
        return { upToDate: true }
      }
    } catch (e) {
      set({ status: 'error', error: { message: (e as Error).message || '检查更新失败' } })
    }
  },
  startDownload: (source: string) => {
    set({ status: 'preparing' })
    window.ipcRenderer.invoke(IPC_CHANNELS.updater.startDownload, source)
  },
  installUpdate: () => {
    set({ status: 'ready' })
    window.ipcRenderer.invoke(IPC_CHANNELS.updater.quitAndInstall)
  },
  setStatus: (status: UpdateStatus) => set({ status }),
  setProgress: (progress: number) => set({ progress }),
  reset: () => set({ status: 'idle', progress: 0, versionInfo: null, error: null }),
  handleError: (error: ErrorType) => {
    if (get().status === 'preparing' || get().status === 'downloading') {
      set({ status: 'error', error })
    }
  },
  handleUpdate: (info: VersionState) => {
    if (get().status === 'idle') {
      set({ status: 'available', versionInfo: info })
    }
  },
  setSource: (source: string) => set({ source }),
}))

export const useUpdateStore = createSelectors(useUpdateStoreBase)
interface UpdateConfigStore {
  enableAutoCheckUpdate: boolean
  source: string
  customSource: string
  setEnableAutoCheckUpdate: (enabled: boolean) => void
  setSource: (source: string) => void
  setCustomSource: (customSource: string) => void
}

export const useUpdateConfigStore = create<UpdateConfigStore>()(
  persist(
    set => ({
      enableAutoCheckUpdate: true,
      source: 'github',
      customSource: '',
      setEnableAutoCheckUpdate: enabled => set({ enableAutoCheckUpdate: enabled }),
      setSource: source => set({ source }),
      setCustomSource: customSource => set({ customSource }),
    }),
    {
      name: 'update-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
