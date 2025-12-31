import { useMemoizedFn } from 'ahooks'
import { useMemo } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { AUTO_REPLY } from '@/constants'
import { EVENTS, eventEmitter } from '@/utils/events'
import { matchObject } from '@/utils/filter'
import { useAccounts } from './useAccounts'
import { type AIProvider, type ChatMessage, useAIChatStore } from './useAIChat'
import { type AutoReplyConfig, useAutoReplyConfig } from './useAutoReplyConfig'
import { useErrorHandler } from './useErrorHandler'
import { useCurrentLiveControl } from './useLiveControl'

interface ReplyPreview {
  id: string
  commentId: string
  replyContent: string
  replyFor: string
  time: string
}

export type Message = LiveMessage
export type MessageType = Message['msg_type']
export type EventMessageType = Extract<
  MessageType,
  | 'room_enter'
  | 'room_like'
  | 'live_order'
  | 'subscribe_merchant_brand_vip'
  | 'room_follow'
  | 'ecom_fansclub_participate'
>
export type MessageOf<T extends MessageType> = Extract<Message, { msg_type: T }>
type CommentMessage = MessageOf<Exclude<MessageType, EventMessageType>>

type ListeningStatus = 'waiting' | 'listening' | 'stopped' | 'error'

interface AutoReplyContext {
  isRunning: boolean
  isListening: ListeningStatus
  replies: ReplyPreview[]
  comments: Message[]
}

interface AutoReplyState {
  contexts: Record<string, AutoReplyContext>
}
interface AutoReplyAction {
  setIsRunning: (accountId: string, isRunning: boolean) => void
  setIsListening: (accountId: string, isListening: ListeningStatus) => void
  addComment: (accountId: string, comment: Message) => void
  addReply: (accountId: string, commentId: string, nickname: string, content: string) => void
  removeReply: (accountId: string, commentId: string) => void
}

const createDefaultContext = (): AutoReplyContext => ({
  isRunning: false,
  isListening: 'stopped',
  replies: [],
  comments: [],
})

export const useAutoReplyStore = create<AutoReplyState & AutoReplyAction>()(
  immer(set => {
    eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
      set(state => {
        delete state.contexts[accountId]
      })
    })

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
          context.comments = [{ ...comment }, ...context.comments].slice(0, AUTO_REPLY.MAX_COMMENTS)
        }),
      addReply: (accountId, commentId, nickname, content) =>
        set(state => {
          const context = ensureContext(state, accountId)
          context.replies = [
            {
              id: crypto.randomUUID(),
              commentId,
              replyContent: content,
              replyFor: nickname,
              time: new Date().toISOString(),
            },
            ...context.replies,
          ].slice(0, AUTO_REPLY.MAX_REPLIES)
        }),
      removeReply: (accountId, commentId) =>
        set(state => {
          const context = ensureContext(state, accountId)
          context.replies = context.replies.filter(reply => reply.commentId !== commentId)
        }),
    }
  }),
)

function generateAIMessages(
  comments: CommentMessage[],
  replies: ReplyPreview[],
): Omit<ChatMessage, 'id' | 'timestamp'>[] {
  // 1. 按时间排序混合评论和回复
  const sortedItems = [
    ...comments.map(c => ({ type: 'comment' as const, time: c.time, data: c })),
    ...replies.map(r => ({ type: 'reply' as const, time: r.time, data: r })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  // 2. 转换为 AI 消息格式
  const rawMessages: Omit<ChatMessage, 'id' | 'timestamp'>[] = sortedItems.map(item => {
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
  })

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
  accountId: string,
  config: AutoReplyConfig,
  sourceMessage: Message,
  errorHandler: ReturnType<typeof useErrorHandler>['handleError'],
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
      const message = replaceUsername(content, sourceMessage.nick_name, config.hideUsername)
      sendMessage(accountId, message, errorHandler) // 注意：这里是异步的，但我们不等待它完成
    }
  }
}

function getRandomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined
  const randomIndex = Math.floor(Math.random() * arr.length)
  return arr[randomIndex]
}

async function sendMessage(
  accountId: string,
  content: string,
  errorHandler: ReturnType<typeof useErrorHandler>['handleError'],
) {
  if (!content) return
  try {
    await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.autoReply.sendReply, accountId, content)
  } catch (err) {
    errorHandler(err, '自动发送回复失败')
  }
}

function replaceUsername(content: string, username: string, mask: boolean) {
  if (!content) return ''
  // 把 {用户名} 替换为 username
  const displayedUsername = mask
    ? `${String.fromCodePoint(username.codePointAt(0) ?? 42 /* 42 是星号 */)}***`
    : username
  return content.replace(new RegExp(AUTO_REPLY.USERNAME_PLACEHOLDER, 'g'), displayedUsername)
}

/**
 * 处理关键字回复逻辑
 * @returns boolean - 是否成功匹配并发送了关键字回复
 */
const handleKeywordReply = (
  comment: CommentMessage,
  config: AutoReplyConfig,
  accountId: string,
  errorHandler: ReturnType<typeof useErrorHandler>['handleError'],
): boolean => {
  if (!config.comment.keywordReply.enable || !comment.content) {
    return false
  }

  const rule = config.comment.keywordReply.rules.find(({ keywords }) =>
    keywords.some(kw => comment.content?.includes(kw)),
  )

  if (rule && rule.contents.length > 0) {
    const content = getRandomElement(rule.contents)
    if (content) {
      const message = replaceUsername(content, comment.nick_name, config.hideUsername)
      sendMessage(accountId, message, errorHandler)
      // 注意：关键字回复不通过 addReply 添加到界面，直接发送
      return true // 匹配成功
    }
  }
  return false // 未匹配
}

/**
 * 处理 AI 回复逻辑
 */
const handleAIReply = async (
  accountId: string,
  comment: CommentMessage,
  allComments: Message[],
  allReplies: ReplyPreview[],
  config: AutoReplyConfig,
  {
    provider,
    model,
    apiKey,
    customBaseURL,
  }: {
    provider: AIProvider
    model: string
    apiKey: string
    customBaseURL: string
  },
  onReply: (content: string) => void,
  errorHandler: ReturnType<typeof useErrorHandler>['handleError'],
) => {
  if (!config.comment.aiReply.enable) return

  const { prompt, autoSend } = config.comment.aiReply

  // 筛选与该用户相关的评论和回复
  const userComments = [comment, ...allComments].filter(
    cmt =>
      (cmt.msg_type === 'comment' || cmt.msg_type === 'wechat_channel_live_msg') &&
      cmt.nick_name === comment.nick_name,
  ) as CommentMessage[]
  const userReplies = allReplies.filter(reply => reply.replyFor === comment.nick_name)

  // 生成 AI 请求的消息体
  const plainMessages = generateAIMessages(userComments, userReplies)

  // 构造系统提示
  const systemPrompt = `你将接收到一个或多个 JSON 字符串，每个字符串代表用户的评论，格式为 {"nickname": "用户昵称", "content": "评论内容"}。请分析所有评论，并根据以下要求生成一个回复：\n${prompt}`

  const messages = [
    { role: 'system', content: systemPrompt }, // id 和 timestamp 对请求不重要
    ...plainMessages,
  ]

  try {
    const replyContent = await window.ipcRenderer.invoke(IPC_CHANNELS.tasks.aiChat.normalChat, {
      messages,
      provider,
      model,
      apiKey,
      customBaseURL,
    })

    if (replyContent && typeof replyContent === 'string') {
      onReply(replyContent)
      // 自动发送
      if (autoSend) {
        sendMessage(accountId, replyContent, errorHandler)
      }
    }
  } catch (err) {
    errorHandler(err, 'AI 生成回复失败')
  }
}

export function useAutoReply() {
  const store = useAutoReplyStore()
  const { currentAccountId } = useAccounts()
  const accountName = useCurrentLiveControl(ctx => ctx.accountName)
  const aiStore = useAIChatStore()
  const { config } = useAutoReplyConfig()
  const { handleError } = useErrorHandler()

  const context = useMemo(() => {
    return store.contexts[currentAccountId] || createDefaultContext()
  }, [store.contexts, currentAccountId])

  const { isRunning, isListening, comments, replies } = context

  const handleComment = useMemoizedFn((comment: Message, accountId: string) => {
    // const context = contexts[accountId] || createDefaultContext()
    const currentContext =
      useAutoReplyStore.getState().contexts[accountId] || createDefaultContext()
    const { isRunning, comments: allComments, replies: allReplies } = currentContext

    store.addComment(accountId, comment)
    if (!isRunning) {
      return
    }

    ;(function handleReply() {
      if (
        // 如果是主播评论就跳过
        comment.nick_name === accountName ||
        // 在黑名单也跳过
        config.blockList?.includes(comment.nick_name)
      ) {
        return
      }
      switch (comment.msg_type) {
        case 'xiaohongshu_comment':
        case 'wechat_channel_live_msg':
        case 'comment': {
          // 优先尝试关键字回复
          const keywordReplied = handleKeywordReply(comment, config, currentAccountId, handleError)
          // 如果关键字未回复，且 AI 回复已启用，则尝试 AI 回复
          if (!keywordReplied && config.comment.aiReply.enable) {
            const { provider, model } = aiStore.config
            const apiKey = aiStore.apiKeys[provider]
            const customBaseURL = aiStore.customBaseURL
            handleAIReply(
              accountId,
              comment,
              allComments,
              allReplies,
              config,
              {
                provider,
                model,
                apiKey,
                customBaseURL,
              },
              (replyContent: string) => {
                store.addReply(accountId, comment.msg_id, comment.nick_name, replyContent)
              },
              handleError,
            )
          }
          break
        }
        case 'live_order': {
          /* 如果设置了仅已支付回复且当前非已支付时不回复 */
          if (!config.live_order.options?.onlyReplyPaid || comment.order_status === '已付款') {
            sendConfiguredReply(accountId, config, comment, handleError)
          }
          break
        }
        default:
          sendConfiguredReply(accountId, config, comment, handleError)
      }
    })()

    ;(function handlePinComment() {
      // 视频号上墙
      if (comment.msg_type === 'wechat_channel_live_msg' && config.pinComment.enable) {
        if (!config.pinComment.includeHost && comment.nick_name === accountName) {
          return
        }
        const { matchStr } = config.pinComment
        // 把平台表情去掉，表情为 [xx]
        const pureTextContent = comment.content.replace(/\[[^\]]{1,3}\]/g, '')
        if (matchStr.some(str => pureTextContent.includes(str))) {
          window.ipcRenderer.invoke(IPC_CHANNELS.tasks.pinComment, {
            accountId,
            content: pureTextContent,
          })
        }
      }
    })()
  })

  return {
    // 当前账户的状态
    isRunning,
    isListening,
    comments, // 当前账户的评论
    replies, // 当前账户的回复

    // Actions (绑定到当前账户)
    handleComment,
    setIsRunning: (running: boolean) => store.setIsRunning(currentAccountId, running),
    setIsListening: (listening: ListeningStatus) =>
      store.setIsListening(currentAccountId, listening),
    removeReply: (commentId: string) => store.removeReply(currentAccountId, commentId),
  }
}
