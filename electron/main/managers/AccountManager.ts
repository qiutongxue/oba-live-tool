import { createLogger } from '#/logger'

class AccountManager {
  private accounts: Map<string, Account> = new Map()
  private activeAccount: Account

  constructor() {
    this.activeAccount = {
      id: 'default',
      name: '默认账号',
    }
  }

  private logger = createLogger('账号管理')

  public setAccount(account: Account) {
    this.accounts.set(account.id, account)
  }

  public getAccount(id: string) {
    return this.accounts.get(id)
  }

  private getNotNullAcconut(id: string, fallback: Account) {
    let account = this.accounts.get(id)
    if (!account) {
      account = fallback
      this.setAccount(fallback)
    }
    return account
  }

  public switchAccount(account: Account) {
    const targetAccount = this.getNotNullAcconut(account.id, account)
    if (this.activeAccount.id !== targetAccount.id) {
      this.activeAccount = targetAccount
      this.logger.info(`切换到账号 <${this.activeAccount.name}>`)
    } else if (targetAccount.name !== account.name) {
      targetAccount.name = account.name
    }
  }

  public updateAccountName(id: string, updatedName: string) {
    const account = this.getNotNullAcconut(id, { id, name: updatedName })
    account.name = updatedName
  }

  public getActiveAccount(): Readonly<Account> {
    return this.activeAccount
  }
}

export const accountManager = new AccountManager()
