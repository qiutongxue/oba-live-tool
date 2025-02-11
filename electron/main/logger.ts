import electronLog from 'electron-log'
import windowManager from './windowManager'

// [2025-02-11 07:30:03.037] [中控台] » INFO         启动中……
electronLog.transports.console.format = ({ data, level, message }) => {
  const text = data.join('\n')
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
    windowManager.sendToWindow('main', 'log', message)
  }
  return message
})

export function createLogger(name: string) {
  return electronLog.scope(name)
}

export default electronLog
