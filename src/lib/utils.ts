import type { ChatMessage } from '@/hooks/useAIChat'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function messagesToContext(messages: ChatMessage[], userMessage: string) {
  const context = messages.filter(message => !message.isError).map(message => ({ role: message.role, content: message.content }))
  // 64k token 限制
  return [...context.slice(-100), { role: 'user', content: userMessage }]
}
