import { app, BrowserWindow, shell } from 'electron'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'

function setupIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.chrome.toggleDevTools, event => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
      } else {
        win.webContents.openDevTools()
      }
    }
  })

  typedIpcMainHandle(IPC_CHANNELS.app.openLogFolder, () => {
    shell.openPath(app.getPath('logs'))
  })

  typedIpcMainHandle(IPC_CHANNELS.account.switch, (_, { account }) => {
    accountManager.switchAccount(account)
  })
}

export function setupAppIpcHandlers() {
  setupIpcHandlers()
}
