import { globalShortcut } from 'electron'
import { throttle } from 'lodash-es'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import { type PopUpConfig, PopUpManager } from '#/tasks/autoPopUp'
import { typedIpcMainHandle } from '#/utils'

const TASK_NAME = '自动弹窗'

// IPC 处理程序
function setupIpcHandlers() {
  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.start, async (_, config) => {
    try {
      // 视频号的商品弹窗不在中控台页面，需要单独处理
      if (pageManager.getContext()?.platform === 'wxchannel') {
        const browserContext = pageManager.getContext()?.browserContext
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
        pageManager.register(
          TASK_NAME,
          (_, account) => new PopUpManager(popUpPage, account, config),
        )
      } else {
        pageManager.register(
          TASK_NAME,
          (page, account) => new PopUpManager(page, account, config),
        )
      }
      pageManager.startTask(TASK_NAME)
      return true
    } catch (error) {
      const logger = createLogger(
        `${TASK_NAME} @${pageManager.currentAccountName}`,
      )
      logger.error(
        '启动自动弹窗失败:',
        error instanceof Error ? error.message : error,
      )
      return false
    }
  })

  typedIpcMainHandle(IPC_CHANNELS.tasks.autoPopUp.stop, async () => {
    pageManager.stopTask(TASK_NAME)
    return true
  })

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.autoPopUp.updateConfig,
    async (_, newConfig) => {
      pageManager.updateTaskConfig(TASK_NAME, newConfig)
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
              pageManager.updateTaskConfig(TASK_NAME, {
                goodsIds: sc.goodsIds,
              } as PopUpConfig)
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
