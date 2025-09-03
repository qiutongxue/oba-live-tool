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
        await accountSession.startTask({
          type: TASK_TYPE,
          config,
        })

        return true
      } catch (error) {
        const logger = createLogger(
          `@${accountManager.getAccountName(accountId)}`,
        ).scope(TASK_NAME)
        logger.error(`启动任务失败：${errorMessage(error)}`)
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
      } catch (error) {
        const logger = createLogger(
          `@${accountManager.getAccountName(accountId)}`,
        ).scope(TASK_NAME)
        logger.error(`停止任务失败：${errorMessage(error)}`)
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
      } catch (error) {
        const logger = createLogger(
          `@${accountManager.getAccountName(accountId)}`,
        ).scope(TASK_NAME)
        logger.error(`更新配置失败：${errorMessage(error)}`)
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
