import { Result } from '@praha/byethrow'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { accountManager } from '#/managers/AccountManager'
import { typedIpcMainHandle } from '#/utils/ipc'

const TASK_TYPE = 'pin-comment'

export function setupPinCommentIpcHandler() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.pinComment, async (_, { accountId, content }) => {
    const accountSession = accountManager.getSession(accountId)
    if (Result.isFailure(accountSession)) {
      return
    }
    accountSession.value.startTask({
      type: TASK_TYPE,
      config: {
        comment: content,
      },
    })
  })
}
