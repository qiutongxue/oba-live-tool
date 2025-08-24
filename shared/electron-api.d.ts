import type { LogMessage } from 'electron-log'
import type {
  ProgressInfo,
  UpdateCheckResult,
  UpdateDownloadedEvent,
} from 'electron-updater'
import type { providers } from 'shared/providers'

import type { AutoReplyConfig } from '#/tasks/autoReply/index'
import { IPC_CHANNELS } from './ipcChannels'

export interface IpcChannels {
  // LiveControl
  [IPC_CHANNELS.tasks.liveControl.connect]: (params: {
    chromePath?: string
    headless?: boolean
    storageState?: string
    platform: LiveControlPlatform
    account: Account
  }) => {
    accountName: string | null
  } | null
  [IPC_CHANNELS.tasks.liveControl.disconnect]: () => boolean
  [IPC_CHANNELS.tasks.liveControl.disconnectedEvent]: (id: string) => void

  // AutoMessage
  [IPC_CHANNELS.tasks.autoMessage.start]: (
    accountId: string,
    config: AutoMessageConfig,
  ) => boolean
  [IPC_CHANNELS.tasks.autoMessage.stop]: (accountId: string) => boolean
  [IPC_CHANNELS.tasks.autoMessage.stoppedEvent]: (id: string) => void
  [IPC_CHANNELS.tasks.autoMessage.sendBatchMessages]: (
    accountId: string,
    messages: string[],
    count: number,
  ) => boolean

  // AutoPopup
  [IPC_CHANNELS.tasks.autoPopUp.start]: (
    accountId: string,
    config: AutoPopupConfig,
  ) => boolean
  [IPC_CHANNELS.tasks.autoPopUp.stop]: (accountId: string) => boolean
  [IPC_CHANNELS.tasks.autoPopUp.stoppedEvent]: (id: string) => void
  [IPC_CHANNELS.tasks.autoPopUp.updateConfig]: (
    accountId: string,
    config: Parital<AutoPopupConfig>,
  ) => void
  [IPC_CHANNELS.tasks.autoPopUp.registerShortcuts]: (
    accountId: string,
    shortcuts: { accelerator: string; goodsIds: number[] }[],
  ) => void
  [IPC_CHANNELS.tasks.autoPopUp.unregisterShortcuts]: () => void

  // AutoReply
  [IPC_CHANNELS.tasks.autoReply.startCommentListener]: (
    config: AutoReplyConfig,
  ) => boolean
  [IPC_CHANNELS.tasks.autoReply.stopCommentListener]: () => void
  [IPC_CHANNELS.tasks.autoReply.sendReply]: (replyContent: string) => void
  [IPC_CHANNELS.tasks.autoReply.listenerStopped]: () => void
  [IPC_CHANNELS.tasks.autoReply.showComment]: (data: {
    comment: DouyinLiveMessage
    accountId: string
  }) => void

  // AIChat
  [IPC_CHANNELS.tasks.aiChat.normalChat]: (params: {
    messages: AIChatMessage[]
    provider: keyof typeof providers
    model: string
    apiKey: string
    customBaseURL?: string
  }) => string | null
  [IPC_CHANNELS.tasks.aiChat.testApiKey]: (params: {
    apiKey: string
    provider: keyof typeof providers
    customBaseURL?: string
  }) => { success: boolean; models?: string[]; error?: string }
  [IPC_CHANNELS.tasks.aiChat.chat]: (params: {
    // 用于启动流式传输，响应通过 stream/error 通道
    messages: AIChatMessage[]
    provider: keyof typeof providers
    model: string
    apiKey: string
    customBaseURL?: string
  }) => void
  [IPC_CHANNELS.tasks.aiChat.stream]: (
    data:
      | {
          chunk: string
          type: 'content' | 'reasoning'
        }
      | { done: boolean },
  ) => void
  [IPC_CHANNELS.tasks.aiChat.error]: (data: { error: string }) => void

  // Updater
  [IPC_CHANNELS.updater.checkUpdate]: (params: {
    source: string
  }) =>
    | UpdateCheckResult
    | { message: string; error: Error; downloadURL?: string }
    | null

  [IPC_CHANNELS.updater.startDownload]: () => void
  [IPC_CHANNELS.updater.quitAndInstall]: () => void
  [IPC_CHANNELS.updater.updateAvailable]: (info: VersionInfo) => void
  [IPC_CHANNELS.updater.updateError]: (error: ErrorType) => void
  [IPC_CHANNELS.updater.downloadProgress]: (progress: ProgressInfo) => void
  [IPC_CHANNELS.updater.updateDownloaded]: (
    event: UpdateDownloadedEvent,
  ) => void

  // Chrome
  [IPC_CHANNELS.chrome.selectPath]: () => string | null
  [IPC_CHANNELS.chrome.getPath]: (edge?: boolean) => string | null
  [IPC_CHANNELS.chrome.toggleDevTools]: () => void
  [IPC_CHANNELS.chrome.setPath]: (path: string) => void
  [IPC_CHANNELS.chrome.saveState]: (accountId: string, state: string) => void

  // App
  [IPC_CHANNELS.app.openLogFolder]: () => void
  [IPC_CHANNELS.app.notifyUpdate]: (arg: {
    currentVersion: string
    latestVersion: string
    releaseNote?: string
  }) => void

  [IPC_CHANNELS.account.switch]: (params: { account: Account }) => void

  // Log
  [IPC_CHANNELS.log]: (message: LogMessage) => void
}

export interface ElectronAPI {
  ipcRenderer: {
    invoke: <Channel extends keyof IpcChannels>(
      channel: Channel,
      ...args: Parameters<IpcChannels[Channel]>
    ) => ReturnType<IpcChannels[Channel]> extends Promise<infer _U>
      ? ReturnType<IpcChannels[Channel]>
      : Promise<ReturnType<IpcChannels[Channel]>>

    send: <Channel extends keyof IpcChannels>(
      channel: Channel,
      ...args: Parameters<IpcChannels[Channel]>
    ) => void

    on: <Channel extends keyof IpcChannels>(
      channel: Channel,
      listener: (...args: Parameters<IpcChannels[Channel]>) => void,
    ) => () => void
  }
}
