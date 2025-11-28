import { IPC_CHANNELS } from 'shared/ipcChannels'
import { updateManager } from '#/managers/UpdateManager'
import { typedIpcMainHandle } from '#/utils'

export function setupUpdateIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.updater.checkUpdate, async () => {
    return updateManager.checkUpdateVersion()
  })

  typedIpcMainHandle(IPC_CHANNELS.updater.startDownload, (_, source) => {
    updateManager.checkForUpdates(source)
  })

  typedIpcMainHandle(IPC_CHANNELS.updater.quitAndInstall, () => {
    return updateManager.quitAndInstall()
  })
}
