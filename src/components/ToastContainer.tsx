import { useToast } from '@/hooks/useToast'
import React from 'react'
import Toast from './Toast'

export function ToastContainer() {
  const { message, type, isActive } = useToast()

  return (
    isActive && message && type && (
      <Toast
        message={message}
        type={type}
      />
    )
  )
}
