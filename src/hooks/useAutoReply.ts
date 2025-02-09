import { useEffect, useRef } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { type ChatMessage, useAIChatStore } from './useAIChat'
import { type Comment, useCommentStore } from './useComment'

interface ReplyPreview {
  id: string
  commentId: string
  replyContent: string
  timestamp: string
}

interface DialogContext {
  id: string
  messages: ChatMessage[]
}

interface AutoReplyStore {
  isRunning: boolean
  setIsRunning: (isRunning: boolean) => void
  contexts: Record<string, DialogContext>
  replies: ReplyPreview[]
  prompt: string
  setPrompt: (prompt: string) => void
  addComment: (comment: Comment) => void
  addReply: (commentId: string, content: string) => void
  removeReply: (commentId: string) => void
}

export const useAutoReplyStore = create<AutoReplyStore>()(
  immer((set) => {
    // 从 localStorage 读取保存的 prompt
    const savedPrompt = localStorage.getItem('autoReplyPrompt')

    return {
      isRunning: false,
      setIsRunning: isRunning => set({ isRunning }),
      replies: [],
      // 设置默认 prompt 或使用保存的值
      prompt: savedPrompt || '你是一个直播间的助手，负责回复观众的评论。请用简短友好的语气回复，不要超过50个字。',
      setPrompt: (prompt: string) => {
        set({ prompt })
        // 保存到 localStorage
        localStorage.setItem('autoReplyPrompt', prompt)
      },
      contexts: {},
      addComment: (comment: Comment) => {
        set((state) => {
          const context = state.contexts[comment.nickname] || { id: crypto.randomUUID(), messages: [] }
          context.messages = [...context.messages, {
            role: 'user',
            id: crypto.randomUUID(),
            content: comment.content, // 只发送评论内容
            timestamp: new Date(comment.timestamp).getTime(),
          }]
          state.contexts[comment.nickname] = context
        })
      },
      addReply: (commentId: string, content: string) => {
        set((state) => {
          state.replies = [{
            id: crypto.randomUUID(),
            commentId,
            replyContent: content,
            timestamp: new Date().toISOString(),
          }, ...state.replies]
        })
      },
      removeReply: (commentId: string) => {
        set((state) => {
          state.replies = state.replies.filter(reply => reply.commentId !== commentId)
        })
      },
    }
  }),
)

export function useAutoReply() {
  const store = useAutoReplyStore()
  const { comments } = useCommentStore()
  const aiStore = useAIChatStore()
  const prevCommentLength = useRef<number | null>(null)

  useEffect(() => {
    if (!store.isRunning) {
      return
    }

    const userComments = comments.filter(cmt => cmt.authorTags.length === 0)

    if (userComments.length === 0 || userComments.length === prevCommentLength.current) {
      return
    }

    prevCommentLength.current = userComments.length

    const newComment = userComments[0]
    store.addComment(newComment)

    const prompt = `你将接收到一组JSON数据，数据代表的是直播间用户的评论内容，nickname 为用户的昵称，commentTags 为用户的标签，content 为用户的评论内容，请你分析这组数据，并按照下面的提示词进行回复：\n${store.prompt}`

    const messages: Omit<ChatMessage, 'id' | 'timestamp'>[] = [
      {
        role: 'system',
        content: prompt, // 使用配置的 prompt
      },
      {
        role: 'user',
        content: JSON.stringify(newComment),
      },
    ]

    window.ipcRenderer.invoke(IPC_CHANNELS.tasks.aiChat.normalChat, {
      messages,
      provider: aiStore.config.provider,
      model: aiStore.config.model,
      apiKey: aiStore.apiKeys[aiStore.config.provider],
    })
      .then((reply) => {
        if (reply && typeof reply === 'string') {
          store.addReply(newComment.id, reply)
        }
      })
      .catch((err) => {
        console.error('生成回复失败:', err)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, store.isRunning])
}
