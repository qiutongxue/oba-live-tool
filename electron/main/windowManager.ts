// utils/windowManager.js
import type { BrowserWindow } from 'electron'
import type { IpcChannels } from 'shared/electron-api'

class WindowManager {
  windows: Map<string, BrowserWindow>

  constructor() {
    this.windows = new Map() // 存储窗口实例
  }

  registerWindow(name: string, window: BrowserWindow) {
    this.windows.set(name, window)
    window.on('closed', () => this.windows.delete(name))
  }

  getWindow(name: string) {
    return this.windows.get(name)
  }

  sendToWindow<Channel extends keyof IpcChannels>(
    name: string,
    channel: Channel,
    ...args: Parameters<IpcChannels[Channel]>
  ) {
    const win = this.windows.get(name)
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args)
      return true
    }
    return false
  }
}

export default new WindowManager()
