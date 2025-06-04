import type { BrowserSession } from '../types'

export abstract class BaseAdapter {
  constructor(protected loginConstants: LoginConstants) {}

  abstract afterLogin(session: BrowserSession): Promise<void>

  public async fetchAccountName(
    session: BrowserSession,
  ): Promise<string | null> {
    if (this.loginConstants.hoverSelector) {
      await session.page.hover(this.loginConstants.hoverSelector)
    }

    await session.page.waitForSelector(this.loginConstants.accountNameSelector)

    const accountName = await session.page
      .$(this.loginConstants.accountNameSelector)
      .then(el => el?.textContent())

    return accountName ?? null
  }
}

export class DefaultAdapter extends BaseAdapter {
  async afterLogin() {}
}
