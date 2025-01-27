import { create } from 'zustand'

type ToastType = 'success' | 'error'

interface ToastStore {
  message: string | null
  type: ToastType | null
  isActive: boolean
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    clear: () => void
  }
}

export const useToast = create<ToastStore>((set) => {
  let timer: NodeJS.Timeout | null = null

  const clearToast = () => {
    set({ message: null, type: null, isActive: false })
  }

  const showToast = (type: ToastType, message: string) => {
    // 清除之前的定时器
    if (timer) {
      clearTimeout(timer)
    }

    // 设置新的 toast
    set({ message, type, isActive: true })
    // 设置新的定时器
    timer = setTimeout(clearToast, 3000)
  }

  return {
    message: null,
    type: null,
    isActive: false,
    toast: {
      success: (message: string) => showToast('success', message),
      error: (message: string) => showToast('error', message),
      clear: clearToast,
    },
  }
})
