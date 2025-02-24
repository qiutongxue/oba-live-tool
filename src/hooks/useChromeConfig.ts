import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'
import { useLiveControl } from './useLiveControl'

interface ChromeConfigV1 {
  path: string
  cookies: string
}

interface ChromeConfig {
  path: string
  cookies: {
    buyin: string
    douyin: string
  }
}

interface ChromeConfigStore {
  contexts: Record<string, ChromeConfig>
  setPath: (accountId: string, path: string) => void
  setCookies: (
    accountId: string,
    platform: keyof ChromeConfig['cookies'],
    cookies: string,
  ) => void
}

const defaultContext = (): ChromeConfig => ({
  path: '',
  cookies: {
    buyin: '',
    douyin: '',
  },
})

export const useChromeConfigStore = create<ChromeConfigStore>()(
  persist(
    immer(set => ({
      contexts: {
        default: defaultContext(),
      },
      setPath: (accountId, path) => {
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].path = path
        })
      },
      setCookies: (accountId, platform, cookies) => {
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].cookies[platform] = cookies
        })
      },
    })),
    {
      name: 'chrome-config',
      version: 2,
      migrate: (persistedState, version) => {
        if (version === 0) {
          const persisted = persistedState as ChromeConfigV1
          return {
            contexts: {
              default: {
                chromePath: persisted?.path,
                cookies: {
                  buyin: '',
                  douyin: persisted?.cookies || '',
                },
              },
            },
          }
        }
        if (version === 1) {
          const persisted = persistedState as {
            contexts: Record<string, ChromeConfigV1>
          }
          return {
            contexts: Object.fromEntries(
              Object.entries(persisted.contexts).map(([accountId, context]) => [
                accountId,
                {
                  ...context,
                  cookies: {
                    buyin: '',
                    douyin: context.cookies,
                  },
                },
              ]),
            ),
          }
        }
      },
    },
  ),
)

export function useChromeConfig() {
  const { contexts, setPath, setCookies } = useChromeConfigStore()
  const { platform } = useLiveControl()
  const currentAccountId = useAccounts(state => state.currentAccountId)
  const context = contexts[currentAccountId] || defaultContext()

  return {
    path: context.path,
    cookies: context.cookies[platform],
    setPath: (path: string) => setPath(currentAccountId, path),
    setCookies: (cookies: string) =>
      setCookies(currentAccountId, platform, cookies),
  }
}
