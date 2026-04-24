export type MainEvents = {
  'page-closed': {
    accountId: string
  }
  'providers-updated': Record<string, ProviderInfo>
}
