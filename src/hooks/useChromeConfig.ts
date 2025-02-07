import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface ChromeConfig {
  path: string
  setPath: (path: string) => void
  cookies: string
  setCookies: (cookies: string) => void
}

export const useChromeConfig = create<ChromeConfig>()(
  persist(
    immer(set => ({
      path: '',
      setPath: (path) => {
        set((state) => {
          state.path = path
        })
      },
      cookies: '',
      setCookies: (cookies) => {
        set((state) => {
          state.cookies = cookies
        })
      },
    })),
    {
      name: 'chrome-config',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
