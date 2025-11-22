import { Result } from '@praha/byethrow'
import { ErrorFactory } from '@praha/error-factory'
import { emitter } from '#/event/eventBus'
import { createLogger } from '#/logger'
import { AccountSession } from '#/services/AccountSession'

class AccountNotFoundError extends ErrorFactory({
  name: 'AccountNotFoundError',
  message: '账号不存在，请先连接中控台',
}) {}

export class AccountManager {
  accountSessions: Map<string, AccountSession> = new Map()
  accountNames: Map<string, string> = new Map()
  private logger = createLogger('账号管理')

  constructor() {
    emitter.on('page-closed', ({ accountId }) => {
      this.closeSession(accountId)
    })
  }

  async createSession(platformName: LiveControlPlatform, account: Account) {
    this.setAccountName(account.id, account.name)
    const existSession = this.accountSessions.get(account.id)
    if (existSession) {
      this.logger.warn('检测到已存在建立的连接，将关闭已建立的连接')
      existSession.disconnect()
    }

    const accountSession = new AccountSession(platformName, account)
    this.accountSessions.set(account.id, accountSession)
    return accountSession
  }

  getSession(accountId: string): Result.Result<AccountSession, Error> {
    const accountSession = this.accountSessions.get(accountId)
    if (!accountSession) {
      return Result.fail(new AccountNotFoundError())
    }
    return Result.succeed(accountSession)
  }

  setAccountName(accountId: string, accountName: string) {
    this.accountNames.set(accountId, accountName)
  }

  getAccountName(accountId: string) {
    return this.accountNames.get(accountId) ?? '未定义账号'
  }

  closeSession(accountId: string) {
    const accountSession = this.accountSessions.get(accountId)
    if (!accountSession) return

    accountSession.disconnect()
    this.accountSessions.delete(accountId)
  }

  cleanup() {
    this.accountSessions.values().forEach(session => {
      session.disconnect()
    })
  }
}

export const accountManager = new AccountManager()
