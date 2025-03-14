import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'

interface ChromeConfigV1 {
  path: string
  cookies: string
}

interface ChromeConfig {
  path: string
  cookies: {
    buyin: string
    douyin: string
    eos: string
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
    eos: '',
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
      version: 3,
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
                  eos: '',
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
                    eos: '',
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

export function useCurrentChromeConfig<T>(
  getters: (state: ChromeConfig) => T,
): T {
  const currentAccountId = useAccounts(state => state.currentAccountId)
  return useChromeConfigStore(state => {
    const context = state.contexts[currentAccountId] ?? defaultContext()
    return getters(context)
  })
}

export function useCurrentChromeConfigActions() {
  const setPath = useChromeConfigStore(state => state.setPath)
  const setCookies = useChromeConfigStore(state => state.setCookies)
  const currentAccountId = useAccounts(state => state.currentAccountId)

  return useMemo(
    () => ({
      setPath: (path: string) => setPath(currentAccountId, path),
      setCookies: (platform: keyof ChromeConfig['cookies'], cookies: string) =>
        setCookies(currentAccountId, platform, cookies),
    }),
    [currentAccountId, setPath, setCookies],
  )
}
