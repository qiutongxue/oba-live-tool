import { useMemoizedFn } from 'ahooks'
import { useMemo } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { type ChatMessage, useAIChatStore } from './useAIChat'
import { useAccounts } from './useAccounts'

interface ReplyPreview {
  id: string
  commentId: string
  replyContent: string
  replyFor: string
  timestamp: string
}

export interface Comment {
  id: string
  nickname: string
  authorTags: string[]
  commentTags: string[]
  content: string
  timestamp: string
}

type ListeningStatus = 'waiting' | 'listening' | 'stopped' | 'error'

interface AutoReplyContext {
  isRunning: boolean
  isListening: ListeningStatus
  replies: ReplyPreview[]
  comments: Comment[]
  prompt: string
  autoSend: boolean
  // 用户屏蔽列表
  userBlocklist: string[]
}

interface AutoReplyState {
  contexts: Record<string, AutoReplyContext>
}
interface AutoReplyAction {
  setIsRunning: (accountId: string, isRunning: boolean) => void
  setIsListening: (accountId: string, isListening: ListeningStatus) => void
  setPrompt: (accountId: string, prompt: string) => void
  addComment: (accountId: string, comment: Comment) => void
  addReply: (
    accountId: string,
    commentId: string,
    nickname: string,
    content: string,
  ) => void
  removeReply: (accountId: string, commentId: string) => void
  setAutoSend: (accountId: string, autoSend: boolean) => void
  setUserBlocklist: (accountId: string, userBlocklist: string[]) => void
}

const defaultPrompt =
  '你是一个直播间的助手，负责回复观众的评论。请用简短友好的语气回复，不要超过50个字。'

const defaultContext = (): AutoReplyContext => ({
  isRunning: false,
  isListening: 'stopped',
  replies: [],
  comments: [],
  prompt: defaultPrompt,
  autoSend: false,
  userBlocklist: [],
})

export const useAutoReplyStore = create<AutoReplyState & AutoReplyAction>()(
  persist(
    immer(set => {
      // 迁移之前版本设置的 prompt
      const previousPrompt = localStorage.getItem('autoReplyPrompt')
      if (previousPrompt) {
        localStorage.removeItem('autoReplyPrompt')
      }

      return {
        contexts: {
          default: {
            ...defaultContext(),
            prompt: previousPrompt || defaultPrompt,
          },
        },
        setIsRunning: (accountId, isRunning) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].isRunning = isRunning
          }),
        setIsListening: (accountId, isListening) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].isListening = isListening
          }),
        setPrompt: (accountId, prompt) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].prompt = prompt
          }),
        addComment: (accountId, comment) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].comments = [
              { ...comment },
              ...state.contexts[accountId].comments,
            ]
          }),
        addReply: (accountId, commentId, nickname, content) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].replies = [
              {
                id: crypto.randomUUID(),
                commentId,
                replyContent: content,
                replyFor: nickname,
                timestamp: new Date().toISOString(),
              },
              ...state.contexts[accountId].replies,
            ]
          }),
        removeReply: (accountId, commentId) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].replies = state.contexts[
              accountId
            ].replies.filter(reply => reply.commentId !== commentId)
          }),
        setAutoSend: (accountId, autoSend) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].autoSend = autoSend
          }),
        setUserBlocklist: (accountId, userBlocklist) =>
          set(state => {
            if (!state.contexts[accountId]) {
              state.contexts[accountId] = defaultContext()
            }
            state.contexts[accountId].userBlocklist = userBlocklist
          }),
      }
    }),
    {
      name: 'auto-reply',
      version: 1,
      partialize: state => {
        return {
          contexts: Object.fromEntries(
            Object.entries(state.contexts).map(([accountId, context]) => [
              accountId,
              {
                prompt: context.prompt,
                autoSend: context.autoSend,
                userBlocklist: context.userBlocklist,
              },
            ]),
          ),
        }
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as AutoReplyState
        return {
          ...currentState,
          ...persisted,
          contexts: Object.fromEntries(
            Object.entries(persisted.contexts || {}).map(
              ([accountId, context]) => [
                accountId,
                { ...defaultContext(), ...context }, // 用默认值补全字段
              ],
            ),
          ),
        }
      },
    },
  ),
)

function generateMessages(comments: Comment[], replies: ReplyPreview[]) {
  const messages: Omit<ChatMessage, 'id' | 'timestamp'>[] = []
  for (
    let i = comments.length - 1, j = replies.length - 1;
    i >= 0 || j >= 0;
  ) {
    if (j < 0 || (i >= 0 && comments[i].timestamp < replies[j].timestamp)) {
      messages.push({
        role: 'user',
        content: JSON.stringify({
          nickname: comments[i].nickname,
          commentTags: comments[i].commentTags,
          content: comments[i].content,
        }),
      })
      i--
    } else {
      messages.push({
        role: 'assistant',
        content: replies[j].replyContent,
      })
      j--
    }
  }

  let content = []
  // 把连续相同角色的消息合并
  const mergedMessages: Omit<ChatMessage, 'id' | 'timestamp'>[] = []
  for (let i = 0, j = 0; i < messages.length; ) {
    while (j < messages.length && messages[j].role === messages[i].role) {
      content.push(messages[j].content)
      j++
    }
    mergedMessages.push({
      role: messages[i].role,
      content: content.join('\n'),
    })
    content = []
    i = j
  }
  return mergedMessages
}

export function useAutoReply() {
  const {
    addReply,
    addComment,
    contexts,
    setIsRunning,
    setIsListening,
    setPrompt,
    setAutoSend,
  } = useAutoReplyStore()
  const { currentAccountId } = useAccounts()
  const aiStore = useAIChatStore()

  const context = useMemo(
    () => contexts[currentAccountId] || defaultContext(),
    [contexts, currentAccountId],
  )
  const { isRunning, isListening, comments, replies, prompt, autoSend } =
    context

  const handleComment = useMemoizedFn((comment: Comment, accountId: string) => {
    const context = contexts[accountId] || defaultContext()
    const { isRunning, comments, replies, prompt, autoSend, userBlocklist } =
      context

    addComment(accountId, comment)
    // 如果是主播评论就跳过
    if (!isRunning || comment.authorTags.length > 0) {
      return
    }
    // 如果用户在屏蔽列表中，也跳过
    if (userBlocklist?.includes(comment.nickname)) {
      return
    }

    // 先根据评论和回复生成 ai 需要的格式
    const plainMessages = generateMessages(
      [comment, ...comments].filter(cmt => cmt.nickname === comment.nickname),
      replies.filter(reply => reply.replyFor === comment.nickname),
    )

    // 开头加上系统提示词
    const systemPrompt = `你将接收到一组或多组JSON数据，每组数据代表的是直播间用户的评论内容，nickname 为用户的昵称，commentTags 为用户的标签，content 为用户的评论内容，请你分析这组数据，如果是多组数据，把多组数据合并成一个回复，并按照下面的提示词进行回复：\n${prompt}`
    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...plainMessages,
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
        if (reply && typeof reply === 'string') {
          addReply(accountId, comment.id, comment.nickname, reply)

          // 如果开启了自动发送，则自动发送回复
          if (autoSend) {
            window.ipcRenderer
              .invoke(IPC_CHANNELS.tasks.autoReply.sendReply, reply)
              .catch(err => {
                console.error('自动发送回复失败:', err)
              })
          }
        }
      })
      .catch(err => {
        console.error('生成回复失败:', err)
      })
  })

  return {
    handleComment,
    isRunning,
    isListening,
    comments,
    replies,
    prompt,
    autoSend,
    setIsRunning: (isRunning: boolean) =>
      setIsRunning(currentAccountId, isRunning),
    setIsListening: (isListening: ListeningStatus) =>
      setIsListening(currentAccountId, isListening),
    setPrompt: (prompt: string) => setPrompt(currentAccountId, prompt),
    setAutoSend: (autoSend: boolean) => setAutoSend(currentAccountId, autoSend),
  }
}
