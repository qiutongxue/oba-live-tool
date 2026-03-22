import cloneDeep from 'lodash-es/cloneDeep'
import { providers } from 'shared/providers'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type AIProvider = keyof typeof providers | 'custom'

type APIKeys = {
  [key in AIProvider]: string
}

export interface ProviderConfig {
  provider: AIProvider
  model: string
  modelPreferences: {
    [key in AIProvider]: string
  }
}

export type AIConfigType = 'chat' | 'autoReply'

interface AIConfig {
  config: ProviderConfig
  apiKeys: APIKeys
  customBaseURL: string
}

interface AIProviderStore {
  chat: AIConfig
  autoReply: AIConfig
  setCustomBaseURL: (type: AIConfigType, url: string) => void
  setConfig: (type: AIConfigType, config: Partial<ProviderConfig>) => void
  setApiKey: (type: AIConfigType, provider: AIProvider, key: string) => void
}

const createDefaultConfig = (): ProviderConfig => {
  const modelPreferences = Object.keys(providers).reduce(
    (acc, provider) => {
      acc[provider as AIProvider] = providers[provider as keyof typeof providers].models[0] || ''
      return acc
    },
    {} as Record<AIProvider, string>,
  )

  return {
    provider: 'deepseek',
    model: providers.deepseek.models[0],
    modelPreferences,
  }
}

const createDefaultApiKeys = (): APIKeys => {
  return Object.keys(providers).reduce(
    (acc, provider) => {
      acc[provider as AIProvider] = ''
      return acc
    },
    {} as Record<AIProvider, string>,
  )
}

const createDefaultAIConfig = (): AIConfig => ({
  config: createDefaultConfig(),
  apiKeys: createDefaultApiKeys(),
  customBaseURL: '',
})

export const useAIProviderStore = create<AIProviderStore>()(
  persist(
    immer(set => {
      return {
        chat: createDefaultAIConfig(),
        autoReply: createDefaultAIConfig(),
        setCustomBaseURL: (type, url) => {
          set(state => {
            state[type].customBaseURL = url
          })
        },
        setConfig: (type, config) => {
          set(state => {
            const currentConfig = state[type].config
            if (config.provider) {
              const newModel = config.model || currentConfig.modelPreferences[config.provider]
              state[type].config.provider = config.provider
              state[type].config.model = newModel
              state[type].config.modelPreferences[config.provider] = newModel
            } else if (config.model) {
              state[type].config.model = config.model
              state[type].config.modelPreferences[currentConfig.provider] = config.model
            }
          })
        },
        setApiKey: (type, provider, key) => {
          set(state => {
            state[type].apiKeys[provider] = key
          })
        },
      }
    }),
    {
      name: 'ai-chat-storage',
      partialize: state => ({
        chat: state.chat,
        autoReply: state.autoReply,
      }),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        // 从原先 useAIChat 旧版本迁移
        if (version === 0) {
          const oldState = (persistedState as AIConfig) || createDefaultAIConfig()
          const migratedState = {
            chat: cloneDeep(oldState),
            autoReply: cloneDeep(oldState),
          }
          return migratedState
        }
        return persistedState
      },
    },
  ),
)

export function useAIProvider(type: AIConfigType) {
  const store = useAIProviderStore()
  const props = store[type]
  const actions = {
    setConfig: (config: Partial<ProviderConfig>) => {
      store.setConfig(type, config)
    },
    setApiKey: (provider: AIProvider, key: string) => {
      store.setApiKey(type, provider, key)
    },
    setCustomBaseURL: (url: string) => {
      store.setCustomBaseURL(type, url)
    },
  }
  return {
    ...props,
    ...actions,
  }
}
