import type { LogMessage } from 'electron-log'
import type {
  ProgressInfo,
  UpdateCheckResult,
  UpdateDownloadedEvent,
} from 'electron-updater'
import type { PopUpConfig } from 'electron/main/tasks/autoPopUp'
import type {
  CommentMessage,
  EcomFansclubParticipateMessage,
  LiveOrderMessage,
  RoomEnterMessage,
  RoomFollowMessage,
  RoomLikeMessage,
  SubscribeMerchantBrandVipMessage,
} from 'electron/main/tasks/autoReplyPlus'
import type { providers } from 'shared/providers'

import type { Account } from '#/taskManager'
import { IPC_CHANNELS } from './ipcChannels'

export interface IpcChannels {
  // --- Renderer -> Main (Invoke/Handle) ---
  [IPC_CHANNELS.tasks.liveControl.connect]: (params: {
    chromePath?: string
    headless?: boolean
    storageState?: string
    platform?: LiveControlPlatform
  }) => {
    storageState: string | null
    accountName: string | null
  } | null
  [IPC_CHANNELS.tasks.autoReply.startCommentListener]: (
    type: 'control' | 'compass',
  ) => boolean
  [IPC_CHANNELS.tasks.aiChat.normalChat]: (params: {
    messages: Message[]
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
  [IPC_CHANNELS.tasks.autoPopUp.start]: (config: PopUpConfig) => boolean
  [IPC_CHANNELS.tasks.autoPopUp.stop]: () => boolean
  [IPC_CHANNELS.tasks.autoPopUp.updateConfig]: (
    config: Parital<PopUpConfig>,
  ) => void
  [IPC_CHANNELS.tasks.autoMessage.start]: (config: AutoMessageConfig) => boolean
  [IPC_CHANNELS.tasks.autoMessage.stop]: () => boolean
  [IPC_CHANNELS.tasks.liveControl.disconnect]: () => boolean
  [IPC_CHANNELS.updater.checkUpdate]: (params: { source: string }) =>
    | UpdateCheckResult
    | { message: string; error: Error; downloadURL?: string }
    | null

  [IPC_CHANNELS.updater.startDownload]: () => void
  [IPC_CHANNELS.updater.quitAndInstall]: () => void
  [IPC_CHANNELS.chrome.selectPath]: () => string | null
  [IPC_CHANNELS.chrome.getPath]: (edge?: boolean) => string | null
  [IPC_CHANNELS.app.openLogFolder]: () => void

  // --- Renderer -> Main (Send/On) ---
  [IPC_CHANNELS.tasks.autoReply.stopCommentListener]: () => void
  [IPC_CHANNELS.tasks.autoReply.sendReply]: (replyContent: string) => void
  [IPC_CHANNELS.chrome.toggleDevTools]: () => void
  [IPC_CHANNELS.tasks.aiChat.chat]: (params: {
    // 用于启动流式传输，响应通过 stream/error 通道
    messages: Message[]
    provider: keyof typeof providers
    model: string
    apiKey: string
    customBaseURL?: string
  }) => void
  [IPC_CHANNELS.account.switch]: (params: {
    accountId: string
    accountNames: Account[]
  }) => void
  [IPC_CHANNELS.tasks.autoReplyPlus.startCommentListener]: () => void
  [IPC_CHANNELS.tasks.autoReplyPlus.stopCommentListener]: () => void

  // --- Main -> Renderer (Send/On) ---
  [IPC_CHANNELS.tasks.autoReply.listenerStopped]: () => void
  [IPC_CHANNELS.tasks.autoReply.showComment]: (data: {
    comment: DouyinLiveMessage
    accountId: string
  }) => void
  [IPC_CHANNELS.log]: (message: LogMessage) => void
  [IPC_CHANNELS.chrome.setPath]: (path: string) => void
  [IPC_CHANNELS.updater.updateAvailable]: (info: VersionInfo) => void
  [IPC_CHANNELS.updater.updateError]: (error: ErrorType) => void
  [IPC_CHANNELS.updater.downloadProgress]: (progress: ProgressInfo) => void
  [IPC_CHANNELS.updater.updateDownloaded]: (
    event: UpdateDownloadedEvent,
  ) => void
  [IPC_CHANNELS.tasks.autoPopUp.stoppedEvent]: (id: string) => void
  [IPC_CHANNELS.tasks.autoMessage.stoppedEvent]: (id: string) => void
  [IPC_CHANNELS.tasks.liveControl.disconnectedEvent]: (id: string) => void
  [IPC_CHANNELS.tasks.aiChat.stream]: (data: {
    chunk: string
    done: boolean
    type: string
  }) => void
  [IPC_CHANNELS.tasks.aiChat.error]: (data: { error: string }) => void
  [IPC_CHANNELS.tasks.autoReplyPlus.message]: (data: {
    accountId: string
    message:
      | CommentMessage
      | RoomEnterMessage
      | RoomLikeMessage
      | SubscribeMerchantBrandVipMessage
      | LiveOrderMessage
      | EcomFansclubParticipateMessage
      | RoomFollowMessage
  }) => void
}

export interface ElectronAPI {
  ipcRenderer: {
    invoke: <Channel extends keyof IpcChannels>(
      channel: Channel,
      ...args: Parameters<IpcChannels[Channel]>
    ) => ReturnType<IpcChannels[Channel]> extends Promise<infer U>
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
