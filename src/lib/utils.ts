import type { ChatMessage } from '@/hooks/useAIChat'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function messagesToContext(messages: ChatMessage[], userMessage: string) {
  const newMessages = []
  for (let i = 0; i < messages.length; i++) {
    // 这里用户发出的消息返回错误了，也就是说用户的消息并未参与到实际的对话中
    // 所以要跳过当前消息，当然同时也要跳过下一个错误消息
    if (messages[i].role === 'user' && i < messages.length - 1 && messages[i + 1].isError) {
      i++
      continue
    }
    newMessages.push({ role: messages[i].role, content: messages[i].content })
  }
  // 64k token 限制
  return [...newMessages.slice(-100), { role: 'user', content: userMessage }]
}
