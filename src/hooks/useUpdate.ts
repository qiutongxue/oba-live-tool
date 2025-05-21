import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface UpdateStore {
  enableAutoCheckUpdate: boolean
  setEnableAutoCheckUpdate: (enabled: boolean) => void
}

export const useUpdateStore = create<UpdateStore>()(
  persist(
    set => ({
      enableAutoCheckUpdate: true,
      setEnableAutoCheckUpdate: enabled =>
        set({ enableAutoCheckUpdate: enabled }),
    }),
    {
      name: 'update-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
