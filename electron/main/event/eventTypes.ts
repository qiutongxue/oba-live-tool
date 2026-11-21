export type MainEvents = {
  'page-closed': {
    accountId: string
  }
  /** 与中控台断开连接（主动断开或浏览器被关） */
  'account-disconnected': {
    accountId: string
  }
  'providers-updated': Record<string, ProviderInfo>
}
