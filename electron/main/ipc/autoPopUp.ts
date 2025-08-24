import { globalShortcut } from 'electron'
import { throttle } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager2'
import { errorMessage, typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动弹窗'
const TASK_TYPE = 'auto-popup'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoPopUp.start,
    async (_, accountId, config) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        accountSession.startTask({
          type: TASK_TYPE,
          config,
        })

        return true
      } catch (error) {
        const logger = createLogger(
          `${TASK_NAME} ${accountManager.getAccountName(accountId)}}`,
        )
        logger.error('启动自动弹窗失败:', errorMessage(error))
        return false
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoPopUp.stop,
    async (_, accountId) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        accountSession.stopTask(TASK_TYPE)
        return true
      } catch {
        return false
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoPopUp.updateConfig,
    async (_, accountId, newConfig) => {
      try {
        const accountSession = accountManager.getSession(accountId)
        accountSession.updateTaskConfig(TASK_TYPE, newConfig)
      } catch {
        // TODO: 错误处理
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoPopUp.registerShortcuts,
    (_, accountId, shortcuts) => {
      for (const sc of shortcuts) {
        globalShortcut.register(
          sc.accelerator,
          throttle(
            () => {
              try {
                const accountSession = accountManager.getSession(accountId)
                accountSession.updateTaskConfig(TASK_TYPE, {
                  goodsIds: sc.goodsIds,
                })
              } catch {
                // TODO: 错误处理
              }
            },
            1000,
            { trailing: false },
          ),
        )
      }
    },
  )

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.unregisterShortcuts, () => {
    globalShortcut.unregisterAll()
  })
}

export function setupAutoPopUpIpcHandlers() {
  setupIpcHandlers()
}
