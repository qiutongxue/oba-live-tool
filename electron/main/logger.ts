import electronLog, { type FormatParams, type LogFunctions } from 'electron-log'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import windowManager from './windowManager'

function formatLogData(data: FormatParams['data'], _level: FormatParams['level']) {
  function errorMessage(item: Error) {
    return `${item.message}\n${item.stack}${item.cause ? `\nCaused by: ${item.cause}` : ''}`
  }
  return data.map(item => (item instanceof Error ? errorMessage(item) : item)).join(' ')
}

// [2025-02-11 07:30:03.037] [中控台] » INFO         启动中……
electronLog.transports.console.format = ({ data, level, message }) => {
  // TODO: error 有可能是：message + Error 的形式，如果带有 Error，要记录堆栈信息
  const text = formatLogData(data, level)
  // 不放 hooks 里了，这样少一次 format 计算
  if (level !== 'verbose' && level !== 'debug') {
    windowManager.send(IPC_CHANNELS.log, { ...message, data: [text] })
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
