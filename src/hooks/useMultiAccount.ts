import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { EVENTS, eventEmitter } from '@/utils/events'
import { useAccounts } from './useAccounts'
import { useLiveControlStore } from './useLiveControl'

interface MultiAccountStore {
  /** 自动发言选中的目标账号 ID 列表 */
  selectedAccountIds: string[]
  setSelectedAccountIds: (ids: string[]) => void
  toggleAccount: (id: string) => void
  selectAll: (ids: string[]) => void
  clear: () => void
}

export const useMultiAccountStore = create<MultiAccountStore>()(
  persist(
    immer(set => {
      eventEmitter.on(EVENTS.ACCOUNT_REMOVED, (accountId: string) => {
        set(state => {
          state.selectedAccountIds = state.selectedAccountIds.filter(id => id !== accountId)
        })
      })

      return {
        selectedAccountIds: ['default'],
        setSelectedAccountIds: ids =>
          set(state => {
            state.selectedAccountIds = ids
          }),
        toggleAccount: id =>
          set(state => {
            state.selectedAccountIds = state.selectedAccountIds.includes(id)
              ? state.selectedAccountIds.filter(item => item !== id)
              : [...state.selectedAccountIds, id]
          }),
        selectAll: ids =>
          set(state => {
            state.selectedAccountIds = [...ids]
          }),
        clear: () =>
          set(state => {
            state.selectedAccountIds = []
          }),
      }
    }),
    {
      name: 'multi-account-targets',
    },
  ),
)

/** 获取选中账号中已连接、可用于发言的账号 ID */
export function useConnectedTargetAccountIds() {
  const selectedAccountIds = useMultiAccountStore(state => state.selectedAccountIds)
  const accounts = useAccounts(state => state.accounts)
  const contexts = useLiveControlStore(state => state.contexts)

  return useMemo(() => {
    const validIds = new Set(accounts.map(account => account.id))
    return selectedAccountIds.filter(
      id => validIds.has(id) && contexts[id]?.isConnected === 'connected',
    )
  }, [selectedAccountIds, accounts, contexts])
}
