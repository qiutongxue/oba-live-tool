import { accountManager } from '#/managers/AccountManager'

export const currentAccountName = () => accountManager.getActiveAccount().name
