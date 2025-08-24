import electronLog, { type LogFunctions } from 'electron-log'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import windowManager from './windowManager'

// [2025-02-11 07:30:03.037] [中控台] » INFO         启动中……
electronLog.transports.console.format = ({ data, level, message }) => {
  const text = data.join(' ')
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
