export enum TaskStopReason {
  COMPLETED = 'completed', // 任务正常完成
  ERROR = 'error', // 任务因错误而终止
  MANUAL = 'manual', // 任务被外部调用 stop 停止
}

export type TaskStopCallback = (
  id: string,
  reason: TaskStopReason,
  error?: unknown,
) => void
export interface ITask<Cfg = unknown> {
  getTaskId(): string
  start(): void // 任务启动，通常是设置一个定时器循环执行
  stop(): void // 任务停止，清除定时器
  /** 任务停止时的回调（不管是手动中止、任务完成或是抛出异常都会触发） */
  onStop(callback: TaskStopCallback): void
  updateConfig?: (cfg: Partial<Cfg>) => void
}
