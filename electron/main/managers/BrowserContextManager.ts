import type { Browser, BrowserContext, Page } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { emitter } from '#/event/eventBus'
import { createLogger } from '#/logger'
import windowManager from '#/windowManager'
import { accountManager } from './AccountManager'

interface Context {
  page: Page
  browser: Browser
  browserContext: BrowserContext
  platform: LiveControlPlatform
}

class BrowserContextManager {
  private logger = createLogger('ContextManager')
  private contexts: Map<string, Context> = new Map()

  public setContext(accountId: string, context: Context) {
    // 不用 browserContext close 或 browser disconnected 的原因：
    // Windows 手动关闭浏览器时（点击右上角的x或标签页的x）无法触发相应事件
    // 只会触发 page close，所以没办法
    context.page.on('close', () => {
      emitter.emit('page-closed', { accountId })

      // 通知前端
      windowManager.send(
        IPC_CHANNELS.tasks.liveControl.disconnectedEvent,
        accountId,
      )
      // MacOS 需要手动关闭浏览器
      context.browser
        .close()
        .catch(e => this.logger.error(`无法关闭浏览器：${e}`))

      this.removeContext(accountId)
    })

    this.contexts.set(accountId, context)
  }

  public getContext(accountId: string) {
    const context = this.contexts.get(accountId)
    if (!context) {
      throw new Error('找不到对应的 context，请确认已连接到中控台')
    }
    return context
  }

  public getCurrentContext() {
    const account = accountManager.getActiveAccount()
    return this.getContext(account.id)
  }

  public removeContext(accountId: string) {
    this.contexts.delete(accountId)
  }

  public getPage(accountId: string) {
    const context = this.getContext(accountId)
    return context.page
  }
}

export const contextManager = new BrowserContextManager()
