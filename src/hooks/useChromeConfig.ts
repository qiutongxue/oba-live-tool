import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'

interface ChromeConfigV1 {
  path: string
  cookies: string
}

interface ChromeConfigV2 {
  path: string
  cookies: {
    buyin: string
    douyin: string
    eos: string
  }
}

interface ChromeConfig {
  path: string
  storageState: string
}

interface ChromeConfigStore {
  contexts: Record<string, ChromeConfig>
  setPath: (accountId: string, path: string) => void
  setStorageState: (accountId: string, storageState: string) => void
}

const defaultContext = (): ChromeConfig => ({
  path: '',
  storageState: '',
})

export const useChromeConfigStore = create<ChromeConfigStore>()(
  persist(
    immer(set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          delete state.contexts[accountId]
        })
      })

      const ensureContext = (state: ChromeConfigStore, accountId: string) => {
        if (!state.contexts[accountId]) {
          state.contexts[accountId] = defaultContext()
        }
        return state.contexts[accountId]
      }
      return {
        contexts: {
          default: defaultContext(),
        },
        setPath: (accountId, path) => {
          set(state => {
            const context = ensureContext(state, accountId)
            context.path = path
          })
        },
        setStorageState: (accountId, storageState) => {
          set(state => {
            const context = ensureContext(state, accountId)
            context.storageState = storageState
          })
        },
      }
    }),
    {
      name: 'chrome-config',
      version: 4,
      migrate: (persistedState, version) => {
        if (version === 0) {
          const persisted = persistedState as ChromeConfigV1
          return {
            contexts: {
              default: {
                path: persisted?.path,
                storageState: '',
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
                  storageState: '',
                },
              ]),
            ),
          }
        }
        if (version === 3) {
          const persisted = persistedState as ChromeConfigV2
          return {
            contexts: {
              default: {
                path: persisted?.path,
                storageState: '',
              },
            },
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
  const setStorageState = useChromeConfigStore(state => state.setStorageState)
  const currentAccountId = useAccounts(state => state.currentAccountId)

  return useMemo(
    () => ({
      setPath: (path: string) => setPath(currentAccountId, path),
      setStorageState: (storageState: string) =>
        setStorageState(currentAccountId, storageState),
    }),
    [currentAccountId, setPath, setStorageState],
  )
}
