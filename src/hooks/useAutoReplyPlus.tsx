import { useMemoizedFn } from 'ahooks'
import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useAccounts } from './useAccounts'

// 从共享类型定义中导入消息类型
export type Message = {
  time: string
  msg_type:
    | 'comment'
    | 'room_enter'
    | 'room_like'
    | 'room_follow'
    | 'subscribe_merchant_brand_vip'
    | 'live_order'
    | 'ecom_fansclub_participate'
  msg_id: string
  nick_name: string
  content?: string
  user_id?: string
  // 订单相关字段
  order_status?: number
  order_ts?: number
  product_id?: string
  product_title?: string
}

interface AutoReplyPlusSettings {
  hideUserName: boolean
  autoReplyRoomEnter: boolean
  roomEnterMessages: string[]
}

interface AutoReplyPlusContext {
  messages: Message[]
  settings: AutoReplyPlusSettings
}

interface AutoReplyPlusState {
  contexts: Record<string, AutoReplyPlusContext>
}

interface AutoReplyPlusAction {
  addMessage: (accountId: string, message: Message) => void
  updateSettings: (
    accountId: string,
    settings: Partial<AutoReplyPlusSettings>,
  ) => void
  addRoomEnterMessage: (accountId: string, message: string) => void
  updateRoomEnterMessage: (
    accountId: string,
    index: number,
    message: string,
  ) => void
  removeRoomEnterMessage: (accountId: string, index: number) => void
}

// 默认上下文
const defaultContext = (): AutoReplyPlusContext => ({
  messages: [],
  settings: {
    hideUserName: false,
    autoReplyRoomEnter: false,
    roomEnterMessages: ['欢迎来到直播间，感谢支持！'],
  },
})

export const useAutoReplyPlusStore = create<
  AutoReplyPlusState & AutoReplyPlusAction
>()(
  persist(
    immer(set => ({
      contexts: {
        default: defaultContext(),
      },
      addMessage: (accountId, message) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].messages = [
            message,
            ...state.contexts[accountId].messages,
          ].slice(0, 100)
        }),
      updateSettings: (accountId, settings) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          Object.assign(state.contexts[accountId].settings, settings)
        }),
      addRoomEnterMessage: (accountId, message) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].settings.roomEnterMessages.push(message)
        }),
      updateRoomEnterMessage: (accountId, index, message) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].settings.roomEnterMessages[index] = message
        }),
      removeRoomEnterMessage: (accountId, index) =>
        set(state => {
          if (!state.contexts[accountId]) {
            state.contexts[accountId] = defaultContext()
          }
          state.contexts[accountId].settings.roomEnterMessages.splice(index, 1)
        }),
    })),
    {
      name: 'autoReplyPlusStore',
      version: 1,
      partialize: state => ({
        contexts: Object.fromEntries(
          Object.entries(state.contexts).map(([accountId, context]) => [
            accountId,
            {
              settings: context.settings,
            },
          ]),
        ),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as AutoReplyPlusState
        return {
          ...currentState,
          ...persisted,
          contexts: Object.fromEntries(
            Object.entries(persisted.contexts || {}).map(
              ([accountId, context]) => [
                accountId,
                {
                  ...defaultContext(),
                  ...context,
                  settings: {
                    ...defaultContext().settings,
                    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                    ...(context as any).settings,
                  },
                },
              ],
            ),
          ),
        }
      },
    },
  ),
)

// 使用 hook
export function useAutoReplyPlus() {
  const { currentAccountId } = useAccounts()
  const {
    contexts,
    addMessage,
    updateSettings,
    addRoomEnterMessage,
    updateRoomEnterMessage,
    removeRoomEnterMessage,
  } = useAutoReplyPlusStore()

  const context = useMemo(
    () => contexts[currentAccountId] || defaultContext(),
    [contexts, currentAccountId],
  )

  return {
    messages: context.messages,
    settings: context.settings,
    addMessage: useMemoizedFn((message: Message) =>
      addMessage(currentAccountId, message),
    ),
    updateSettings: useMemoizedFn((settings: Partial<AutoReplyPlusSettings>) =>
      updateSettings(currentAccountId, settings),
    ),
    addRoomEnterMessage: useMemoizedFn((message: string) =>
      addRoomEnterMessage(currentAccountId, message),
    ),
    updateRoomEnterMessage: useMemoizedFn((index: number, message: string) =>
      updateRoomEnterMessage(currentAccountId, index, message),
    ),
    removeRoomEnterMessage: useMemoizedFn((index: number) =>
      removeRoomEnterMessage(currentAccountId, index),
    ),
  }
}
