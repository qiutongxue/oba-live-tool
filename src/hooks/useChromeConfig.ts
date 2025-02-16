import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'

interface ChromeConfig {
  path: string
  cookies: string
}
interface ChromeConfigStore {
  contexts: Record<string, ChromeConfig>
  setPath: (accountId: string, path: string) => void
  setCookies: (accountId: string, cookies: string) => void
}

const defaultContext: ChromeConfig = {
  path: '',
  cookies: '',
}

export const useChromeConfigStore = create<ChromeConfigStore>()(
  persist(
    immer(set => ({
      contexts: {
        default: defaultContext,
      },
      setPath: (accountId, path) => {
        set((state) => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext
          }
          state.contexts[accountId].path = path
        })
      },
      setCookies: (accountId, cookies) => {
        set((state) => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext
          }
          state.contexts[accountId].cookies = cookies
        })
      },
    })),
    {
      name: 'chrome-config',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          return {
            contexts: {
              default: persistedState,
            },
          }
        }
      },
    },
  ),
)

export function useChromeConfig() {
  const { contexts, setPath, setCookies } = useChromeConfigStore()

  const currentAccountId = useAccounts(state => state.currentAccountId)
  const context = contexts[currentAccountId] || defaultContext

  return {
    path: context.path,
    cookies: context.cookies,
    setPath: (path: string) => setPath(currentAccountId, path),
    setCookies: (cookies: string) => setCookies(currentAccountId, cookies),
  }
}
