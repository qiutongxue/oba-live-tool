import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface ChromeConfig {
  path: string
  setPath: (path: string) => void
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
    })),
    {
      name: 'chrome-config',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
