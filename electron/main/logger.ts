import type { SignaleOptions } from 'signale'
import process from 'node:process'
import { Writable } from 'node:stream'
import chalk from 'chalk'
import signale from 'signale'
import windowManager from './windowManager'

// 创建自定义流处理日志
const logStream = new Writable({
  write(chunk, encoding, callback) {
    const logEntry = chunk.toString().trim()
    windowManager.sendToWindow('main', 'log', logEntry)
    callback()
  },
}) as NodeJS.WriteStream

const options: SignaleOptions = {
  stream: [process.stdout, logStream],
  types: {
    debug: {
      color: 'gray',
      badge: '⚒️',
      label: chalk.bold.gray('DEBUG'),
    },
    info: {
      color: 'blue',
      badge: 'ℹ️',
      label: chalk.bold.blue('INFO'),
    },
    success: {
      color: 'green',
      badge: '✅',
      label: chalk.bold.green('SUCCESS'),
    },
    warn: {
      color: 'yellow',
      badge: '⚠️',
      label: chalk.bold.yellow('WARN'),
    },
    error: {
      color: 'red',
      badge: '❌',
      label: chalk.bold.red('ERROR'),
    },
    fatal: {
      color: 'magenta',
      badge: '💣',
      label: chalk.bold.magenta('FATAL'),
    },
    note: {
      color: 'cyan',
      badge: '📝',
      label: chalk.bold.cyan('NOTE'),
    },
  },
}

const logger = new signale.Signale(options)
logger.config({
  displayDate: true,
  displayTimestamp: true,
  displayScope: true,
  displayLabel: true,
  displayBadge: false,
  underlineLabel: false,
})

export function createLogger(name: string) {
  return logger.scope(name)
}

export default logger
