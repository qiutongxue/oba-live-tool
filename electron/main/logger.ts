import electronLog, { type LogFunctions } from 'electron-log'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import windowManager from './windowManager'

// [2025-02-11 07:30:03.037] [中控台] » INFO         启动中……
electronLog.transports.console.format = ({ data, level, message }) => {
  // TODO: error 有可能是：message + Error 的形式，如果带有 Error，要记录堆栈信息
  let text = ''
  if (level !== 'error') {
    text = data.join(' ')
  } else {
    for (const item of data) {
      if (item instanceof Error) {
        text += `${item.message}\n${item.stack}`
      } else {
        text += `${String(item)} `
      }
    }
  }

  return [
    `[${message.date.toLocaleString()}]`,
    message.scope ? `[${message.scope}]` : '',
    '»',
    `${level.toUpperCase()}`,
    `\t${text}`,
  ]
}
electronLog.scope.labelPadding = false
electronLog.addLevel('success', 3)
electronLog.hooks.push((message, transport) => {
  if (transport === electronLog.transports.console) {
    if (message.level !== 'debug' && message.level !== 'verbose') {
      windowManager.send(IPC_CHANNELS.log, message)
    }
  }
  return message
})

export interface ScopedLogger extends LogFunctions {
  scope(name: string): ScopedLogger
}

export function createLogger(name: string): ScopedLogger {
  const logger = electronLog.scope(name)
  return {
    scope(scopeName: string) {
      const newScopeName = `${name} -> ${scopeName}`
      return createLogger(newScopeName)
    },
    ...logger,
  }
}

export default electronLog
