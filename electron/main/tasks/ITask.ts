export enum TaskStopReason {
  /** 任务正常完成 */
  COMPLETED = 'completed',
  /** 任务因错误而终止 */
  ERROR = 'error',
  /** 任务被外部调用 stop 停止 */
  MANUAL = 'manual',
}

export type TaskStopCallback = (
  id: string,
  reason: TaskStopReason,
  error?: unknown,
) => void
export interface ITask<Cfg = unknown> {
  getTaskId(): string
  start(): void | Promise<void>
  stop(): void
  /** 任务停止时的回调（不管是手动中止、任务完成或是抛出异常都会触发） */
  onStop(callback: TaskStopCallback): void
  updateConfig?: (cfg: Partial<Cfg>) => void
}
