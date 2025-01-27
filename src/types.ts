export interface TaskConfig {
  autoMessage: {
    enabled: boolean
    scheduler: {
      interval: [number, number] // [最小间隔, 最大间隔]
    }
    messages: string[]
    pinTops: number[] // 需要置顶的消息索引
    random: boolean
  }
  autoPopUp: {
    enabled: boolean
    scheduler: {
      interval: [number, number]
    }
    goodsIds: number[]
    random: boolean
  }
}
