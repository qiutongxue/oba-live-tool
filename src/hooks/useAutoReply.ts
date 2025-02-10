import { IPC_CHANNELS } from 'shared/ipcChannels'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { type ChatMessage, useAIChatStore } from './useAIChat'

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

interface AutoReplyStore {
  isRunning: boolean
  setIsRunning: (isRunning: boolean) => void
  replies: ReplyPreview[]
  comments: Comment[]
  prompt: string
  setPrompt: (prompt: string) => void
  addComment: (comment: Comment) => void
  addReply: (commentId: string, nickname: string, content: string) => void
  removeReply: (commentId: string) => void
}

// nickname -> contextId
// const contextMap = new Map<string, number>()

export const useAutoReplyStore = create<AutoReplyStore>()(
  immer((set) => {
    // 从 localStorage 读取保存的 prompt
    const savedPrompt = localStorage.getItem('autoReplyPrompt')

    return {
      isRunning: false,
      setIsRunning: isRunning => set({ isRunning }),
      replies: [],
      comments: [],
      // 设置默认 prompt 或使用保存的值
      prompt: savedPrompt || '你是一个直播间的助手，负责回复观众的评论。请用简短友好的语气回复，不要超过50个字。',
      setPrompt: (prompt: string) => {
        set({ prompt })
        // 保存到 localStorage
        localStorage.setItem('autoReplyPrompt', prompt)
      },
      addComment: (comment: Comment) => {
        set((state) => {
          state.comments = [{ ...comment }, ...state.comments]
        })
      },
      addReply: (commentId: string, nickname: string, content: string) => {
        set((state) => {
          state.replies = [{
            id: crypto.randomUUID(),
            commentId,
            replyContent: content,
            replyFor: nickname,
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

function generateMessages(comments: Comment[], replies: ReplyPreview[]) {
  const messages: Omit<ChatMessage, 'id' | 'timestamp'>[] = []
  for (let i = comments.length - 1, j = replies.length - 1; i >= 0 || j >= 0;) {
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
    }
    else {
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
  for (let i = 0, j = 0; i < messages.length;) {
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
  const { isRunning, comments, replies, addReply, addComment, prompt } = useAutoReplyStore()
  const aiStore = useAIChatStore()

  const handleComment = (comment: Comment) => {
    addComment(comment)
    // 如果是主播评论就跳过
    if (!isRunning || comment.authorTags.length > 0) {
      return
    }

    // 发送消息给 AI
    const plainMessages = generateMessages(
      [comment, ...comments].filter(cmt => cmt.nickname === comment.nickname),
      replies.filter(reply => reply.replyFor === comment.nickname),
    )

    const systemPrompt = `你将接收到一组JSON数据，数据代表的是直播间用户的评论内容，nickname 为用户的昵称，commentTags 为用户的标签，content 为用户的评论内容，请你分析这组数据，并按照下面的提示词进行回复：\n${prompt}`
    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...plainMessages,
    ]

    // 把 messages 发送给 AI
    window.ipcRenderer.invoke(IPC_CHANNELS.tasks.aiChat.normalChat, {
      messages,
      provider: aiStore.config.provider,
      model: aiStore.config.model,
      apiKey: aiStore.apiKeys[aiStore.config.provider],
    }).then((reply) => {
      if (reply && typeof reply === 'string') {
        addReply(comment.id, comment.nickname, reply)
      }
    }).catch((err) => {
      console.error('生成回复失败:', err)
    })
  }

  return { handleComment }
}
