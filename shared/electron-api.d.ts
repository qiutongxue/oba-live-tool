import type { LogMessage } from 'electron-log'
import type {
  ProgressInfo,
  UpdateCheckResult,
  UpdateDownloadedEvent,
} from 'electron-updater'
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
import type { Comment } from 'src/components/autoReply/index'
import type { Account } from '#/taskManager'
import { IPC_CHANNELS } from './ipcChannels'

interface RendererParamsMapping {
  [IPC_CHANNELS.tasks.autoReply.stopCommentListener]: []
  [IPC_CHANNELS.tasks.autoReply.showComment]: [
    {
      comment: Comment
      accountId: string
    },
  ]
  [IPC_CHANNELS.log]: [message: LogMessage]
  [IPC_CHANNELS.chrome.setPath]: [path: string]
  [IPC_CHANNELS.updater.updateAvailable]: [VersionInfo]
  [IPC_CHANNELS.updater.updateError]: [ErrorType]
  [IPC_CHANNELS.updater.downloadProgress]: [ProgressInfo]
  [IPC_CHANNELS.updater.updateDownloaded]: [UpdateDownloadedEvent]
  [IPC_CHANNELS.tasks.autoPopUp.stop]: [id: string]
  [IPC_CHANNELS.tasks.autoMessage.stop]: [id: string]
  [IPC_CHANNELS.tasks.liveControl.disconnect]: [id: string]
  [IPC_CHANNELS.tasks.aiChat.stream]: [
    { chunk: string; done: boolean; type: string },
  ]
  [IPC_CHANNELS.tasks.aiChat.error]: [{ error: string }]
  [IPC_CHANNELS.tasks.autoReplyPlus.message]: [
    {
      accountId: string
      message:
        | CommentMessage
        | RoomEnterMessage
        | RoomLikeMessage
        | SubscribeMerchantBrandVipMessage
        | LiveOrderMessage
        | EcomFansclubParticipateMessage
        | RoomFollowMessage
    },
  ]
}

interface MainParamsMapping {
  [IPC_CHANNELS.tasks.liveControl.connect]: [
    {
      chromePath?: string
      headless?: boolean
      cookies?: string
      platform?: 'douyin' | 'buyin'
    },
  ]
  [IPC_CHANNELS.tasks.autoReply.startCommentListener]: ['control' | 'compass']
  [IPC_CHANNELS.tasks.autoReply.stopCommentListener]: []
  [IPC_CHANNELS.tasks.autoReply.sendReply]: [replyContent: string]
  [IPC_CHANNELS.tasks.aiChat.normalChat]: [
    {
      messages: Message[]
      provider: keyof typeof providers
      model: string
      apiKey: string
      customBaseURL?: string
    },
  ]
  [IPC_CHANNELS.chrome.toggleDevTools]: []
  [IPC_CHANNELS.chrome.selectPath]: []
  [IPC_CHANNELS.chrome.getPath]: [edge?: boolean]
  [IPC_CHANNELS.tasks.autoPopUp.start]: [config: AutoPopUpConfig]
  [IPC_CHANNELS.tasks.autoPopUp.stop]: []
  [IPC_CHANNELS.tasks.autoMessage.start]: [config: AutoMessageConfig]
  [IPC_CHANNELS.tasks.autoMessage.stop]: []
  [IPC_CHANNELS.tasks.aiChat.chat]: [
    {
      messages: Message[]
      provider: keyof typeof providers
      model: string
      apiKey: string
      customBaseURL?: string
    },
  ]
  [IPC_CHANNELS.tasks.aiChat.testApiKey]: [
    {
      apiKey: string
      provider: keyof typeof providers
      customBaseURL?: string
    },
  ]
  [IPC_CHANNELS.tasks.liveControl.disconnect]: []
  [IPC_CHANNELS.updater.checkUpdate]: [{ source: string }]
  [IPC_CHANNELS.updater.startDownload]: []
  [IPC_CHANNELS.updater.quitAndInstall]: []
  [IPC_CHANNELS.account.switch]: [
    {
      accountId: string
      accountNames: Account[]
    },
  ]
  [IPC_CHANNELS.app.openLogFolder]: []
  [IPC_CHANNELS.tasks.autoReplyPlus.startCommentListener]: []
  [IPC_CHANNELS.tasks.autoReplyPlus.stopCommentListener]: []
}

interface MainReturnTypeMapping {
  [IPC_CHANNELS.tasks.liveControl.connect]: {
    cookies: string
    accountName: string
  }
  [IPC_CHANNELS.tasks.autoReply.startCommentListener]: boolean
  [IPC_CHANNELS.tasks.autoReply.sendReply]: undefined
  [IPC_CHANNELS.tasks.aiChat.normalChat]: string
  [IPC_CHANNELS.tasks.aiChat.testApiKey]: {
    success: boolean
    models?: string[]
    error?: string
  }
  [IPC_CHANNELS.tasks.autoPopUp.start]: boolean
  [IPC_CHANNELS.tasks.autoPopUp.stop]: boolean
  [IPC_CHANNELS.tasks.autoMessage.start]: boolean
  [IPC_CHANNELS.tasks.autoMessage.stop]: boolean
  [IPC_CHANNELS.tasks.liveControl.disconnect]: boolean
  [IPC_CHANNELS.updater.checkUpdate]:
    | {
        message: string
        error: Error
        downloadURL?: string
      }
    | UpdateCheckResult
  [IPC_CHANNELS.updater.startDownload]: undefined
  [IPC_CHANNELS.updater.quitAndInstall]: undefined
  [IPC_CHANNELS.chrome.selectPath]: string
  [IPC_CHANNELS.chrome.getPath]: string
  [IPC_CHANNELS.app.openLogFolder]: undefined
  [IPC_CHANNELS.tasks.autoReplyPlus.getLiveRoomId]: string
}

export interface ElectronAPI {
  ipcRenderer: {
    on<K extends keyof RendererParamsMapping>(
      channel: K,
      listener: (...args: RendererParamsMapping[K]) => void,
    ): () => void
    send<K extends keyof MainParamsMapping>(
      channel: K,
      ...args: MainParamsMapping[K]
    ): void
    invoke<K extends keyof MainParamsMapping>(
      channel: K,
      ...args: MainParamsMapping[K]
    ): Promise<MainReturnTypeMapping[K]>
  }
}
