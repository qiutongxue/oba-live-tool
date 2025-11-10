import { IPC_CHANNELS } from 'shared/ipcChannels'
import { updateManager } from '#/managers/UpdateManager'
import { typedIpcMainHandle } from '#/utils'

export function setupUpdateIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.updater.checkUpdate,
    async (_, { source }: { source: string }) => {
      return updateManager.checkForUpdates(source)
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.updater.startDownload, () => {
    return updateManager.startDownload()
  })

  typedIpcMainHandle(IPC_CHANNELS.updater.quitAndInstall, () => {
    return updateManager.quitAndInstall()
  })
}
