import { ErrorFactory } from '@praha/error-factory'

export const platformErrorMessages = {
  POPUP_BUTTON_NOT_FOUND: '找不到弹窗按钮',
  POPUP_BUTTON_DISABLED: '无法点击讲解按钮，可能未开播',
  COMMENT_SUBMIT_BUTTON_NOT_FOUND: '找不到发送按钮',
  COMMENT_SUBMIT_BUTTON_DISABLED: '无法点击发送按钮，可能未输入文字',
  GOODS_ID_IS_NOT_A_NUMBER: '商品ID不是数字',
  COMMENT_TEXT_AREA_NOT_FOUND: '找不到评论输入框',
  ACTION_PANEL_NOT_FOUND: '找不到操作面板',
} as const

export class ConnectionError extends ErrorFactory({
  name: 'LiveControlConnectError',
  message: () => '无法连接到直播中控台',
  // fields: ErrorFactory.fields<{}>(),
}) {}

export class ElementNotFoundError extends ErrorFactory({
  name: 'ElementNotFoundError',
  message: ({ elementName }) => `找不到元素 ${elementName}`,
  fields: ErrorFactory.fields<{
    elementName: string
    selector?: string
  }>(),
}) {}

export class ElementContentMismatchedError extends ErrorFactory({
  name: 'ElementContentMismatchedError',
  message: ({ current, target }) =>
    `元素内容不匹配：当前内容为 ${current}，目标内容为 ${target}`,
  fields: ErrorFactory.fields<{
    current: string
    target: string
    selector?: string
  }>(),
}) {}

export class UnexpectedError extends Error {
  public override readonly name = 'UnexpectedError'
}

export class PageNotFoundError extends ErrorFactory({
  name: 'PageNotFoundError',
  message: '找不到页面，请确认已连接到中控台，并且未关闭中控台页面',
}) {}

export class MaxTryCountExceededError extends ErrorFactory({
  name: 'MaxTryCountExceededError',
  message: ({ taskName, maxTryCount }) =>
    `超过最大尝试次数 ${maxTryCount}，任务执行失败： ${taskName}`,
  fields: ErrorFactory.fields<{
    taskName: string
    maxTryCount: number
  }>(),
}) {}

export class ElementDisabledError extends ErrorFactory({
  name: 'ElementDisabledError',
  message: ({ elementName }) => `元素 ${elementName} 已禁用`,
  fields: ErrorFactory.fields<{
    elementName: string
    element: string
  }>(),
}) {}

export type PlatformError =
  | ConnectionError
  | ElementNotFoundError
  | ElementDisabledError
  | MaxTryCountExceededError
  | ElementContentMismatchedError
  | PageNotFoundError
  | UnexpectedError

// export class PlatformError extends AppError {
//   name = 'PlatformError'

//   static popUpButtonNotFound(message?: string) {
//     return new PlatformError(
//       message || platformErrorMessages.POPUP_BUTTON_NOT_FOUND,
//     )
//   }

//   static popUpButtonDisabled(message?: string) {
//     return new PlatformError(
//       message || platformErrorMessages.POPUP_BUTTON_DISABLED,
//     )
//   }

//   static commentSubmitButtonNotFound(message?: string) {
//     return new PlatformError(
//       message || platformErrorMessages.COMMENT_SUBMIT_BUTTON_NOT_FOUND,
//     )
//   }

//   static commentSubmitButtonDisabled(message?: string) {
//     return new PlatformError(
//       message || platformErrorMessages.COMMENT_SUBMIT_BUTTON_DISABLED,
//     )
//   }

//   static goodsIdIsNotANumber(message?: string) {
//     return new PlatformError(
//       message || platformErrorMessages.GOODS_ID_IS_NOT_A_NUMBER,
//     )
//   }

//   static commentTextAreaNotFound(message?: string) {
//     return new PlatformError(
//       message || platformErrorMessages.COMMENT_TEXT_AREA_NOT_FOUND,
//     )
//   }

//   static actionPanelNotFound(message?: string) {
//     return new PlatformError(
//       message || platformErrorMessages.ACTION_PANEL_NOT_FOUND,
//     )
//   }
// }
