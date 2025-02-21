import type { LogMessage } from 'electron-log'
import type {
  ProgressInfo,
  UpdateCheckResult,
  UpdateDownloadedEvent,
} from 'electron-updater'
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
  [IPC_CHANNELS.tasks.autoReply.startCommentListener]: []
  [IPC_CHANNELS.tasks.autoReply.sendReply]: [replyContent: string]
  [IPC_CHANNELS.tasks.aiChat.normalChat]: [
    {
      messages: Message[]
      provider: keyof typeof providers
      model: string
      apiKey: string
    },
  ]
  [IPC_CHANNELS.chrome.toggleDevTools]: []
  [IPC_CHANNELS.tasks.autoPopUp.start]: [config: AutoPopUpConfig]
  [IPC_CHANNELS.tasks.autoPopUp.stop]: []
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
}

interface MainReturnTypeMapping {
  [IPC_CHANNELS.tasks.liveControl.connect]: {
    cookies: string
    accountName: string
  }
  [IPC_CHANNELS.tasks.autoReply.startCommentListener]: boolean
  [IPC_CHANNELS.tasks.autoReply.sendReply]: undefined
  [IPC_CHANNELS.tasks.aiChat.normalChat]: string
  [IPC_CHANNELS.tasks.autoPopUp.start]: boolean
  [IPC_CHANNELS.tasks.autoPopUp.stop]: boolean
  [IPC_CHANNELS.tasks.liveControl.disconnect]: boolean
  [IPC_CHANNELS.updater.checkUpdate]:
    | {
        message: string
        error: Error
      }
    | UpdateCheckResult
  [IPC_CHANNELS.updater.startDownload]: undefined
  [IPC_CHANNELS.updater.quitAndInstall]: undefined
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
