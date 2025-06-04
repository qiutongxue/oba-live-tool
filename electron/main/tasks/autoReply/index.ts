export interface AutoReplyConfig {
  source: 'compass' | 'control'
  ws?: {
    port: number
  }
}
