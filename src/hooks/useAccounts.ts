import { eventEmitter, EVENTS } from '@/utils/events'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface Account {
  id: string
  name: string
  cookies: string
  config: Record<string, any>
}

interface AccountsStore {
  accounts: Account[]
  currentAccountId: string
  addAccount: (name: string) => void
  removeAccount: (id: string) => void
  switchAccount: (id: string) => void
  updateAccountCookies: (cookies: string) => void
  updateAccountConfig: (config: Partial<Record<string, any>>) => void
  getCurrentAccount: () => Account | undefined
}

export const useAccounts = create<AccountsStore>()(
  persist(
    immer((set, get) => ({
      accounts: [{ id: 'default', name: '默认账号', cookies: '', config: {} }],
      currentAccountId: 'default',

      addAccount: (name: string) => {
        set((state) => {
          const newId = crypto.randomUUID()
          state.accounts.push({
            id: newId,
            name,
            cookies: '',
            config: {},
          })
          eventEmitter.emit(EVENTS.ACCOUNT_ADDED, newId, name)
        })
      },

      removeAccount: (id: string) => {
        set((state) => {
          state.accounts = state.accounts.filter(acc => acc.id !== id)
          if (state.currentAccountId === id) {
            state.currentAccountId = 'default'
          }
          eventEmitter.emit(EVENTS.ACCOUNT_REMOVED, id)
        })
      },

      switchAccount: (id: string) => {
        set((state) => {
          state.currentAccountId = id
          eventEmitter.emit(EVENTS.ACCOUNT_SWITCHED, id)
        })
      },

      updateAccountCookies: (cookies: string) => {
        set((state) => {
          const account = state.accounts.find(acc => acc.id === state.currentAccountId)
          if (account) {
            account.cookies = cookies
          }
        })
      },

      updateAccountConfig: (config: Partial<Record<string, any>>) => {
        set((state) => {
          const account = state.accounts.find(acc => acc.id === state.currentAccountId)
          if (account) {
            account.config = { ...account.config, ...config }
          }
        })
      },

      getCurrentAccount: () => {
        return get().accounts.find(acc => acc.id === get().currentAccountId)
      },
    })),
    {
      name: 'accounts-storage',
      partialize: state => ({
        accounts: state.accounts,
        currentAccountId: state.currentAccountId,
      }),
    },
  ),
)
