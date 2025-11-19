import { Result } from '@praha/byethrow'
import { globalShortcut } from 'electron'
import { throttle } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动弹窗'
const TASK_TYPE = 'auto-popup'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.start, async (_, accountId, config) => {
    return await Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(accountSession =>
        accountSession.startTask({
          type: TASK_TYPE,
          config,
        }),
      ),
      Result.inspectError(error => {
        const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
        logger.error('启动任务失败：', error)
      }),
      r => r.then(Result.isSuccess),
    )
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.stop, async (_, accountId) => {
    const accountSession = accountManager.getSession(accountId)
    if (Result.isFailure(accountSession)) {
      const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
      logger.error('停止任务失败：', accountSession.error)
      return false
    }
    accountSession.value.stopTask(TASK_TYPE)
    return true
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.updateConfig, async (_, accountId, newConfig) => {
    const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
    Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(accountSession => accountSession.updateTaskConfig(TASK_TYPE, newConfig)),
      Result.inspect(_ => logger.info('更新配置成功')),
      Result.inspectError(error => logger.error('更新配置失败：', error)),
    )
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.registerShortcuts, (_, accountId, shortcuts) => {
    const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope('快捷键弹窗')
    for (const sc of shortcuts) {
      globalShortcut.register(
        sc.accelerator,
        throttle(
          () => {
            Result.pipe(
              accountManager.getSession(accountId),
              Result.andThen(accountSession =>
                accountSession.updateTaskConfig(TASK_TYPE, {
                  goodsIds: sc.goodsIds,
                }),
              ),
              Result.inspect(_ => logger.info(`切换到商品组[${sc.goodsIds.join(',')}]`)),
              Result.inspectError(error => {
                logger.error('切换失败：', error)
              }),
            )
          },
          1000,
          { trailing: false },
        ),
      )
    }
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.unregisterShortcuts, () => {
    globalShortcut.unregisterAll()
  })
}

export function setupAutoPopUpIpcHandlers() {
  setupIpcHandlers()
}
