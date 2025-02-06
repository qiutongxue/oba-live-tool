import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface DevMode {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useDevMode = create<DevMode>()(
  persist(
    set => ({
      enabled: false,
      setEnabled: enabled => set({ enabled }),
    }),
    {
      name: 'dev-mode-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
