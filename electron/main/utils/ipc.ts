import { type IpcMainEvent, type IpcMainInvokeEvent, ipcMain } from 'electron'
import type { IpcChannels } from 'shared/electron-api'

export function typedIpcMainHandle<Channel extends keyof IpcChannels>(
  channel: Channel,
  listener: (
    event: IpcMainInvokeEvent,
    ...args: Parameters<IpcChannels[Channel]>
  ) =>
    | ReturnType<IpcChannels[Channel]>
    | Promise<ReturnType<IpcChannels[Channel]>>,
): void {
  ipcMain.handle(channel as string, listener)
}

export function typedIpcMainOn<Channel extends keyof IpcChannels>(
  channel: Channel,
  listener: (
    event: IpcMainEvent,
    ...args: Parameters<IpcChannels[Channel]>
  ) => void,
): void {
  ipcMain.on(channel as string, listener)
}
