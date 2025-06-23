import { globalShortcut } from 'electron'
import { throttle } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { contextManager } from '#/managers/BrowserContextManager'
import { taskManager } from '#/managers/TaskManager'
import { type AutoPopUpConfig, AutoPopUpTask } from '#/tasks/autoPopUp'
import { typedIpcMainHandle } from '#/utils'
import { currentAccountName } from './utils'

const TASK_NAME = '自动弹窗'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.start, async (_, config) => {
    try {
      // 视频号的商品弹窗不在中控台页面，需要单独处理
      const context = contextManager.getCurrentContext()
      if (context.platform === 'wxchannel') {
        const browserContext = context.browserContext
        if (!browserContext) throw new Error('无法获取浏览器上下文')
        // 先判断是否有商品管理页面
        let popUpPage = browserContext
          .pages()
          .find(page => page.url().includes('commodity/onsale/index'))

        // 没有就创建一个
        if (!popUpPage) {
          popUpPage = await browserContext.newPage()
          await popUpPage.goto(
            'https://channels.weixin.qq.com/platform/live/commodity/onsale/index',
          )
        }
        taskManager.register(
          TASK_NAME,
          (_, account) => new AutoPopUpTask(popUpPage, account, config),
        )
      } else {
        taskManager.register(
          TASK_NAME,
          (page, account) => new AutoPopUpTask(page, account, config),
        )
      }
      taskManager.startTask(TASK_NAME)
      return true
    } catch (error) {
      const logger = createLogger(`${TASK_NAME} @${currentAccountName()}`)
      logger.error(
        '启动自动弹窗失败:',
        error instanceof Error ? error.message : error,
      )
      return false
    }
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.stop, async () => {
    taskManager.stopTask(TASK_NAME)
    return true
  })

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoPopUp.updateConfig,
    async (_, newConfig) => {
      taskManager.updateTaskConfig(TASK_NAME, newConfig)
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoPopUp.registerShortcuts,
    (_, shortcuts) => {
      for (const sc of shortcuts) {
        globalShortcut.register(
          sc.accelerator,
          throttle(
            () => {
              taskManager.updateTaskConfig(TASK_NAME, {
                goodsIds: sc.goodsIds,
              } as AutoPopUpConfig)
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
