import type { ElectronAPI } from 'shared/electron-api'
/// <reference types="vite/client" />

declare global {
  interface Window {
    // expose in the `electron/preload/index.ts`
    ipcRenderer: ElectronAPI['ipcRenderer']
    ipcChannels: ElectronAPI['ipcChannels']
  }
}
