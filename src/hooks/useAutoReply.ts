import { useMemoizedFn } from 'ahooks'
import { useMemo } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { EVENTS, eventEmitter } from '@/utils/events'
import { matchObject, type StringFilterConfig } from '@/utils/filter'
import { mergeWithoutArray } from '@/utils/misc'
import { useAccounts } from './useAccounts'
import { type ChatMessage, useAIChatStore } from './useAIChat'
import { useCurrentLiveControl } from './useLiveControl'

type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? {
          [P in keyof T]?: DeepPartial<T[P]>
        }
      : T

interface ReplyPreview {
  id: string
  commentId: string
  replyContent: string
  replyFor: string
  time: string
}

export type MessageType =
  | 'comment'
  | 'room_enter'
  | 'room_like'
  | 'room_follow'
  | 'subscribe_merchant_brand_vip'
  | 'live_order'
  | 'ecom_fansclub_participate'

export type EventMessageType = Exclude<MessageType, 'comment'>

export type Message = DouyinLiveMessage
export type MessageOf<T extends MessageType> = Extract<Message, { msg_type: T }>

type ListeningStatus = 'waiting' | 'listening' | 'stopped' | 'error'

interface AutoReplyContext {
  isRunning: boolean
  isListening: ListeningStatus
  replies: ReplyPreview[]
  comments: Message[]
  config: AutoReplyConfig
}

interface AutoReplyBaseConfig {
  entry: 'control' | 'compass' // 中控台 | 电商罗盘
  hideUsername: boolean
  comment: {
    keywordReply: {
      enable: boolean
      rules: {
        keywords: string[]
        contents: string[]
      }[]
    }
    aiReply: {
      enable: boolean
      prompt: string
      autoSend: boolean
    }
  }
  blockList: string[]
  ws?: {
    enable: boolean
    port: number
  }
}

export type SimpleEventReplyMessage =
  | string
  | { content: string; filter: StringFilterConfig }

export interface SimpleEventReply {
  enable: boolean
  messages: SimpleEventReplyMessage[]
  options?: Record<string, boolean>
}

type EventBasedReplies = {
  [K in EventMessageType]: SimpleEventReply
}

export type AutoReplyConfig = AutoReplyBaseConfig & EventBasedReplies

interface AutoReplyState {
  contexts: Record<string, AutoReplyContext>
}
interface AutoReplyAction {
  setIsRunning: (accountId: string, isRunning: boolean) => void
  setIsListening: (accountId: string, isListening: ListeningStatus) => void
  addComment: (accountId: string, comment: Message) => void
  addReply: (
    accountId: string,
    commentId: string,
    nickname: string,
    content: string,
  ) => void
  removeReply: (accountId: string, commentId: string) => void

  updateConfig: (
    accountId: string,
    configUpdates: DeepPartial<AutoReplyConfig>,
  ) => void
}

const defaultPrompt =
  '你是一个直播间的助手，负责回复观众的评论。请用简短友好的语气回复，不要超过50个字。'

const createDefaultConfig = (): AutoReplyConfig => {
  return {
    entry: 'control',
    hideUsername: false,
    comment: {
      keywordReply: {
        enable: false,
        rules: [],
      },
      aiReply: {
        enable: false,
        prompt: defaultPrompt,
        autoSend: false,
      },
    },
    room_enter: {
      enable: false,
      messages: [],
    },
    room_like: {
      enable: false,
      messages: [],
    },
    subscribe_merchant_brand_vip: {
      enable: false,
      messages: [],
    },
    live_order: {
      enable: false,
      messages: [],
      options: {
        onlyReplyPaid: false,
      },
    },
    room_follow: {
      enable: false,
      messages: [],
    },
    ecom_fansclub_participate: {
      enable: false,
      messages: [],
    },
    blockList: [],
    ws: {
      enable: false,
      port: 12354,
    },
  }
}

const createDefaultContext = (): AutoReplyContext => ({
  isRunning: false,
  isListening: 'stopped',
  replies: [],
  comments: [],
  config: createDefaultConfig(),
})

const USERNAME_PLACEHOLDER = '{用户名}'

export const useAutoReplyStore = create<AutoReplyState & AutoReplyAction>()(
  persist(
    immer(set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          delete state.contexts[accountId]
        })
      })

      // 迁移之前版本设置的 prompt
      const previousPrompt = localStorage.getItem('autoReplyPrompt')
      if (previousPrompt) {
        localStorage.removeItem('autoReplyPrompt')
      }

      const ensureContext = (state: AutoReplyState, accountId: string) => {
        if (!state.contexts[accountId]) {
          state.contexts[accountId] = createDefaultContext()
        }
        return state.contexts[accountId]
      }

      return {
        contexts: {},
        setIsRunning: (accountId, isRunning) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.isRunning = isRunning
          }),
        setIsListening: (accountId, isListening) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.isListening = isListening
          }),

        addComment: (accountId, comment) =>
          set(state => {
            const context = ensureContext(state, accountId)
            // 限制评论数量，防止内存无限增长
            const MAX_COMMENTS = 500
            context.comments = [{ ...comment }, ...context.comments].slice(
              0,
              MAX_COMMENTS,
            )
          }),
        addReply: (accountId, commentId, nickname, content) =>
          set(state => {
            const context = ensureContext(state, accountId)
            // 限制回复数量 (可选)
            const MAX_REPLIES = 500
            context.replies = [
              {
                id: crypto.randomUUID(),
                commentId,
                replyContent: content,
                replyFor: nickname,
                time: new Date().toISOString(),
              },
              ...context.replies,
            ].slice(0, MAX_REPLIES)
          }),
        removeReply: (accountId, commentId) =>
          set(state => {
            const context = ensureContext(state, accountId)
            context.replies = context.replies.filter(
              reply => reply.commentId !== commentId,
            )
          }),

        updateConfig: (accountId, configUpdates) =>
          set(state => {
            const context = ensureContext(state, accountId)
            const newConfig = mergeWithoutArray(context.config, configUpdates)
            context.config = newConfig
          }),
      }
    }),
    {
      name: 'auto-reply',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: state => {
        return {
          contexts: Object.fromEntries(
            Object.entries(state.contexts).map(([accountId, context]) => [
              accountId,
              {
                config: context.config,
                // prompt: context.prompt,
                // autoSend: context.autoSend,
                // userBlocklist: context.userBlocklist,
              },
            ]),
          ),
        }
      },
      merge: (persistedState, currentState) => {
        // 合并时，用默认值填充缺失的字段
        const mergedContexts: Record<string, AutoReplyContext> = {}
        const persistedContexts =
          (persistedState as Partial<AutoReplyState>)?.contexts || {}

        // 获取当前所有账户 ID (包括可能只在内存中的)
        const allAccountIds = new Set([
          ...Object.keys(currentState.contexts),
          ...Object.keys(persistedContexts),
        ])

        for (const accountId of allAccountIds) {
          const currentContextPartial = currentState.contexts[accountId] || {}
          const persistedContextPartial = persistedContexts[accountId] as
            | Partial<AutoReplyContext>
            | undefined

          mergedContexts[accountId] = {
            ...createDefaultContext(),
            ...currentContextPartial,
            ...(persistedContextPartial && {
              config: persistedContextPartial.config,
            }),
          }
        }

        return {
          ...currentState,
          contexts: mergedContexts,
        }
      },
      migrate: (persistedState, version) => {
        if (version === 1) {
          try {
            const persisted = persistedState as {
              contexts: Record<string, { prompt: string }>
            }
            const contexts: Record<string, AutoReplyContext> = {}
            for (const key in persisted.contexts) {
              contexts[key] = createDefaultContext()
              contexts[key].config.comment.aiReply.prompt =
                persisted.contexts[key].prompt
            }

            return { contexts }
          } catch {
            return {
              contexts: {
                default: createDefaultContext(),
              },
            }
          }
        }
      },
    },
  ),
)
function generateAIMessages(
  comments: MessageOf<'comment'>[],
  replies: ReplyPreview[],
): Omit<ChatMessage, 'id' | 'timestamp'>[] {
  // 1. 按时间排序混合评论和回复
  const sortedItems = [
    ...comments.map(c => ({ type: 'comment' as const, time: c.time, data: c })),
    ...replies.map(r => ({ type: 'reply' as const, time: r.time, data: r })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  // 2. 转换为 AI 消息格式
  const rawMessages: Omit<ChatMessage, 'id' | 'timestamp'>[] = sortedItems.map(
    item => {
      if (item.type === 'comment') {
        return {
          role: 'user',
          // 发送给 AI 的格式，包含昵称和内容
          content: JSON.stringify({
            nickname: item.data.nick_name,
            content: item.data.content ?? '', // 确保 content 是字符串
          }),
        }
      }
      // item.type === 'reply'
      return {
        role: 'assistant',
        content: item.data.replyContent,
      }
    },
  )

  // 3. 合并连续的同角色消息
  if (rawMessages.length === 0) {
    return []
  }

  const mergedMessages: Omit<ChatMessage, 'id' | 'timestamp'>[] = []
  let currentMessage = { ...rawMessages[0], content: [rawMessages[0].content] } // 初始化第一个消息

  for (let i = 1; i < rawMessages.length; i++) {
    if (rawMessages[i].role === currentMessage.role) {
      currentMessage.content.push(rawMessages[i].content) // 追加内容
    } else {
      // 角色变化，保存之前的消息，开始新消息
      mergedMessages.push({
        role: currentMessage.role,
        content: currentMessage.content.join('\n'), // 用换行符合并内容
      })
      currentMessage = { ...rawMessages[i], content: [rawMessages[i].content] }
    }
  }

  // 添加最后一条消息
  mergedMessages.push({
    role: currentMessage.role,
    content: currentMessage.content.join('\n'),
  })

  return mergedMessages
}

function sendConfiguredReply(
  config: AutoReplyConfig,
  sourceMessage: Message,
): void {
  const replyConfig = config[sourceMessage.msg_type as EventMessageType]
  if (replyConfig.enable && replyConfig.messages.length > 0) {
    const filterMessages = []
    const pureMessages = []
    for (const message of replyConfig.messages) {
      if (typeof message === 'string') {
        pureMessages.push(message)
      } else if (matchObject(sourceMessage, message.filter)) {
        filterMessages.push(message.content)
      }
    }
    const replyMessages = filterMessages.length ? filterMessages : pureMessages
    const content = getRandomElement(replyMessages)
    if (content) {
      const message = replaceUsername(
        content,
        sourceMessage.nick_name,
        config.hideUsername,
      )
      sendMessage(message) // 注意：这里是异步的，但我们不等待它完成
    }
  }
}

function getRandomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined
  const randomIndex = Math.floor(Math.random() * arr.length)
  return arr[randomIndex]
}

async function sendMessage(content: string) {
  if (!content) return
  try {
    await window.ipcRenderer.invoke(
      IPC_CHANNELS.tasks.autoReply.sendReply,
      content,
    )
  } catch (err) {
    console.error('自动发送回复失败:', err)
  }
}

function replaceUsername(content: string, username: string, mask: boolean) {
  if (!content) return ''
  // 把 {用户名} 替换为 username
  const displayedUsername = mask
    ? `${String.fromCodePoint(username.codePointAt(0) ?? 42 /* 42 是星号 */)}***`
    : username
  return content.replace(
    new RegExp(USERNAME_PLACEHOLDER, 'g'),
    displayedUsername,
  )
}

export function useAutoReply() {
  const store = useAutoReplyStore()
  const { currentAccountId } = useAccounts()
  const accountName = useCurrentLiveControl(ctx => ctx.accountName)
  const aiStore = useAIChatStore()

  const context = useMemo(() => {
    return store.contexts[currentAccountId] || createDefaultContext()
  }, [store.contexts, currentAccountId])

  const { isRunning, isListening, comments, replies, config } = context

  /**
   * 处理关键字回复逻辑
   * @returns boolean - 是否成功匹配并发送了关键字回复
   */
  const handleKeywordReply = useMemoizedFn(
    (comment: MessageOf<'comment'>, config: AutoReplyConfig): boolean => {
      if (!config.comment.keywordReply.enable || !comment.content) {
        return false
      }

      const rule = config.comment.keywordReply.rules.find(({ keywords }) =>
        keywords.some(kw => comment.content?.includes(kw)),
      )

      if (rule && rule.contents.length > 0) {
        const content = getRandomElement(rule.contents)
        if (content) {
          const message = replaceUsername(
            content,
            comment.nick_name,
            config.hideUsername,
          )
          sendMessage(message)
          // 注意：关键字回复不通过 addReply 添加到界面，直接发送
          return true // 匹配成功
        }
      }
      return false // 未匹配
    },
  )

  /**
   * 处理 AI 回复逻辑
   */
  const handleAIReply = useMemoizedFn(
    async (
      accountId: string,
      comment: MessageOf<'comment'>,
      allComments: Message[],
      allReplies: ReplyPreview[],
      config: AutoReplyConfig,
    ) => {
      if (!config.comment.aiReply.enable) return

      const { prompt, autoSend } = config.comment.aiReply
      const { provider, model } = aiStore.config
      const apiKey = aiStore.apiKeys[provider]
      const customBaseURL = aiStore.customBaseURL

      // 筛选与该用户相关的评论和回复
      const userComments = [comment, ...allComments].filter(
        cmt =>
          cmt.msg_type === 'comment' && cmt.nick_name === comment.nick_name,
      ) as MessageOf<'comment'>[]
      const userReplies = allReplies.filter(
        reply => reply.replyFor === comment.nick_name,
      )

      // 生成 AI 请求的消息体
      const plainMessages = generateAIMessages(userComments, userReplies)

      // 构造系统提示
      // 优化提示词，明确指出 JSON 格式
      const systemPrompt = `你将接收到一个或多个 JSON 字符串，每个字符串代表用户的评论，格式为 {"nickname": "用户昵称", "content": "评论内容"}。请分析所有评论，并根据以下要求生成一个回复：\n${prompt}`

      const messages = [
        { role: 'system', content: systemPrompt }, // id 和 timestamp 对请求不重要
        ...plainMessages,
      ]

      try {
        const replyContent = await window.ipcRenderer.invoke(
          IPC_CHANNELS.tasks.aiChat.normalChat,
          {
            messages,
            provider,
            model,
            apiKey,
            customBaseURL,
          },
        )

        if (replyContent && typeof replyContent === 'string') {
          // 将 AI 回复添加到状态中
          store.addReply(
            accountId,
            comment.msg_id,
            comment.nick_name,
            replyContent,
          )

          // 如果开启自动发送，则发送
          if (autoSend) {
            sendMessage(replyContent)
          }
        }
      } catch (err) {
        console.error('AI 生成回复失败:', err)
        // 可以在这里添加错误处理，比如更新状态或提示用户
      }
    },
  )

  const handleComment = useMemoizedFn((comment: Message, accountId: string) => {
    // const context = contexts[accountId] || createDefaultContext()
    const currentContext =
      useAutoReplyStore.getState().contexts[accountId] || createDefaultContext()
    const {
      isRunning,
      comments: allComments,
      replies: allReplies,
      config,
    } = currentContext

    store.addComment(accountId, comment)
    if (
      !isRunning ||
      // 如果是主播评论就跳过
      comment.nick_name === accountName ||
      // 在黑名单也跳过
      config.blockList?.includes(comment.nick_name)
    ) {
      return
    }

    switch (comment.msg_type) {
      case 'comment': {
        // 优先尝试关键字回复
        const keywordReplied = handleKeywordReply(comment, config)
        // 如果关键字未回复，且 AI 回复已启用，则尝试 AI 回复
        if (!keywordReplied && config.comment.aiReply.enable) {
          handleAIReply(accountId, comment, allComments, allReplies, config)
        }
        break
      }
      case 'live_order': {
        /* 如果设置了仅已支付回复且当前非已支付时不回复 */
        if (
          !config.live_order.options?.onlyReplyPaid ||
          comment.order_status === '已付款'
        ) {
          sendConfiguredReply(config, comment)
        }
        break
      }
      default:
        sendConfiguredReply(config, comment)
    }
  })

  return {
    // 当前账户的状态
    isRunning,
    isListening,
    comments, // 当前账户的评论
    replies, // 当前账户的回复
    config, // 当前账户的配置

    // Actions (绑定到当前账户)
    handleComment,
    setIsRunning: (running: boolean) =>
      store.setIsRunning(currentAccountId, running),
    setIsListening: (listening: ListeningStatus) =>
      store.setIsListening(currentAccountId, listening),
    removeReply: (commentId: string) =>
      store.removeReply(currentAccountId, commentId),

    // 快捷方式更新 prompt (示例)
    updateKeywordRules: (
      rules: AutoReplyConfig['comment']['keywordReply']['rules'],
    ) => {
      store.updateConfig(currentAccountId, {
        comment: { keywordReply: { rules } },
      })
    },
    updateAIReplySettings: (
      settings: DeepPartial<AutoReplyConfig['comment']['aiReply']>,
    ) => {
      store.updateConfig(currentAccountId, { comment: { aiReply: settings } })
    },
    updateGeneralSettings: (
      settings: DeepPartial<Pick<AutoReplyConfig, 'entry' | 'hideUsername'>>,
    ) => {
      store.updateConfig(currentAccountId, settings)
    },
    updateEventReplyContents: (
      replyType: EventMessageType,
      contents: SimpleEventReplyMessage[],
    ) => {
      store.updateConfig(currentAccountId, {
        [replyType]: { messages: contents },
      })
    },
    updateBlockList: (blockList: string[]) => {
      store.updateConfig(currentAccountId, { blockList })
    },
    updateKeywordReplyEnabled: (enable: boolean) => {
      store.updateConfig(currentAccountId, {
        comment: { keywordReply: { enable } },
      })
    },
    updateEventReplyEnabled: (replyType: EventMessageType, enable: boolean) => {
      store.updateConfig(currentAccountId, {
        [replyType]: { enable },
      })
    },
    updateEventReplyOptions: <T extends EventMessageType>(
      replyType: T,
      options: AutoReplyConfig[T]['options'],
    ) => {
      store.updateConfig(currentAccountId, {
        [replyType]: { options },
      })
    },
    updateWSConfig: (wsConfig: DeepPartial<AutoReplyConfig['ws']>) => {
      store.updateConfig(currentAccountId, { ws: wsConfig })
    },
    // 可以根据需要添加更多快捷更新配置的方法
  }
}
