import { EVENTS, eventEmitter } from '@/utils/events'
import { useMemoizedFn } from 'ahooks'
import { useMemo, useRef } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useShallow } from 'zustand/react/shallow'
import { useAccounts } from './useAccounts'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { useAIChatStore } from './useAIChat'

export interface Message {
  id: string
  content: string
  pinTop: boolean
}

interface AutoMessageConfig {
  scheduler: {
    interval: [number, number] // [最小间隔, 最大间隔]
  }
  messages: Message[]
  random: boolean,
  baseContent: string
}

interface AutoMessageContext {
  isRunning: boolean
  config: AutoMessageConfig
}

const defaultContext = (): AutoMessageContext => ({
  isRunning: false,
  config: {
    scheduler: {
      interval: [30000, 60000],
    },
    messages: [],
    random: false,
    baseContent: '',
  },
})

interface AutoMessageStore {
  contexts: Record<string, AutoMessageContext>
  setIsRunning: (accountId: string, running: boolean) => void
  setConfig: (accountId: string, config: Partial<AutoMessageConfig>) => void
}

export const useAutoMessageStore = create<AutoMessageStore>()(
  persist(
    immer(set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          delete state.contexts[accountId]
        })
      })

      eventEmitter.on(EVENTS.ACCOUNT_ADDED, (accountId: string) => {
        set(state => {
          state.contexts[accountId] = defaultContext()
        })
      })

      return {
        contexts: { default: defaultContext() },
        setIsRunning: (accountId, running) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].isRunning = running
          }),
        setConfig: (accountId, config) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].config = {
              ...state.contexts[accountId].config,
              ...config,
            }
          }),
      }
    }),
    {
      name: 'auto-message-storage',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          try {
            const persisted = persistedState as {
              config: {
                scheduler: { interval: [number, number] }
                messages: string[]
                pinTops: number[]
                random: boolean
              }
            }
            const messages = persisted.config.messages.map(
              (message, index) => ({
                id: crypto.randomUUID(),
                content: message as string,
                pinTop: persisted.config.pinTops.includes(index),
              }),
            )
            return {
              contexts: {
                default: {
                  config: {
                    scheduler: persisted.config.scheduler,
                    messages,
                    random: persisted.config.random,
                  },
                },
              },
            }
          } catch {
            return {
              contexts: {
                default: defaultContext(),
              },
            }
          }
        }
      },
      partialize: state => ({
        contexts: Object.fromEntries(
          Object.entries(state.contexts).map(([accountId, context]) =>
            // [accountId, context { isRunning, config }]
            [
              accountId,
              Object.fromEntries(
                Object.entries(context).filter(([key]) => key !== 'isRunning'),
              ),
            ],
          ),
        ),
      }),
    },
  ),
)

export const useAutoMessageActions = () => {
  const aiStore = useAIChatStore()
  const setIsRunning = useAutoMessageStore(state => state.setIsRunning)
  const setConfig = useAutoMessageStore(state => state.setConfig)
  const currentAccountId = useAccounts(state => state.currentAccountId)
  const updateConfig = useMemoizedFn(
    (newConfig: Partial<AutoMessageConfig>) => {
      setConfig(currentAccountId, newConfig)
    },
  )
  const generateMessages = useMemoizedFn((content: String) => {
     // 开头加上系统提示词
     const systemPrompt = `你将接收到一个商品介绍内容，请你根据介绍内容扩充生成10条直播带货商品介绍话术，每条不超过50字，并直接返回严格字符串数组格式,如["xxx","xxx"]，不需要其他文字说明。`
     const messages = [
       {
         role: 'system',
         content: systemPrompt,
       },{
         role: 'user',
         content: content,
       }
     ]
       // 把 messages 发送给 AI
       window.ipcRenderer
         .invoke(IPC_CHANNELS.tasks.aiChat.normalChat, {
           messages,
           provider: aiStore.config.provider,
           model: aiStore.config.model,
           apiKey: aiStore.apiKeys[aiStore.config.provider],
           customBaseURL: aiStore.customBaseURL,
       })
       .then(reply => {
         console.log('生成文案成功:', reply)
         if (reply && typeof reply === 'string') {           
           const replyMessages = JSON.parse(reply)
           setConfig(currentAccountId, {
             messages: replyMessages.map((message: string) =>{
               return {
                 id: crypto.randomUUID(),
                 content: message,
                 pinTop: false,
               }
             }),
           })
           
         }
       })
       .catch(err => {
         console.error('生成文案失败:', err)
       })
  })

  return useMemo(
    () => ({
      setIsRunning: (running: boolean) => setIsRunning(currentAccountId, running),
      setScheduler: (scheduler: AutoMessageConfig['scheduler']) => updateConfig({ scheduler }),
      setMessages: (messages: Message[]) => updateConfig({ messages }),
      setRandom: (random: boolean) => updateConfig({ random }),
      setBaseContent: (baseContent: string) => updateConfig({ baseContent }),
      generateMessages: (content: String) => {
        generateMessages(content)
      }
    }),
    [currentAccountId, setIsRunning, updateConfig],
  )
}

export const useCurrentAutoMessage = <T>(
  getter: (context: AutoMessageContext) => T,
): T => {
  const currentAccountId = useAccounts(state => state.currentAccountId)
  const defaultContextRef = useRef(defaultContext())
  return useAutoMessageStore(
    useShallow(state => {
      const context =
        state.contexts[currentAccountId] ?? defaultContextRef.current
      return getter(context)
    }),
  )
}
