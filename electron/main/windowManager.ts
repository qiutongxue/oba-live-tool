// utils/windowManager.js
import type { BrowserWindow } from 'electron'
import type { IpcChannels } from 'shared/electron-api'

class WindowManager {
  private mainWindow?: BrowserWindow

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win

    // 自动清理引用
    win.on('closed', () => {
      this.mainWindow = undefined
    })
  }

  send<Channel extends keyof IpcChannels>(
    channel: Channel,
    ...args: Parameters<IpcChannels[Channel]>
  ): boolean {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args)
      return true
    }
    return false
  }
}

export default new WindowManager()
