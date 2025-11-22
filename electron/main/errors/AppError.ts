import { ErrorFactory } from '@praha/error-factory'

export class AppError extends Error {}

export class UnexpectedError extends ErrorFactory({
  name: 'UnexpectedError',
  message: ({ description }) => description || '意外错误',
  fields: ErrorFactory.fields<{ description?: string }>(),
}) {}

export class AbortError extends ErrorFactory({
  name: 'AbortedError',
  message: '被中断',
}) {}

export class TaskNotSupportedError extends ErrorFactory({
  name: 'TaskNotImplementedError',
  message: ({ taskName, targetName }) => `${targetName ?? ''}暂不支持任务${taskName}`,
  fields: ErrorFactory.fields<{ taskName: string; targetName?: string }>(),
}) {}
