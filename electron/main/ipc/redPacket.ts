import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '一键发红包'

function setupIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.redPacket.send, async (_, accountId, duration) => {
    const logger = createLogger(`@${accountManager.getAccountName(accountId)}`).scope(TASK_NAME)
    logger.info(`限时领取时长：${duration}`)

    return await Result.pipe(
      accountManager.getSession(accountId),
      Result.andThen(session => session.sendRedPacket(duration)),
      Result.inspect(() => logger.success('一键发红包执行成功')),
      Result.inspectError(error => logger.error('一键发红包执行失败：', error)),
      r => r.then(Result.isSuccess),
    )
  })
}

export function setupRedPacketIpcHandlers() {
  setupIpcHandlers()
}
