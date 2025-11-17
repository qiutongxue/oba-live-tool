import { ErrorFactory } from '@praha/error-factory'

export class AppError extends Error {}

export class UnexpectedError extends ErrorFactory({
  name: 'UnexpectedError',
  message: ({ description }) => description || '意外错误',
  fields: ErrorFactory.fields<{ description?: string }>(),
}) {}
