import type { Page } from 'playwright'
import { emitter } from '#/event/eventBus'
import { createLogger } from '../logger'
import type { BaseConfig, Scheduler } from '../tasks/scheduler'
import { accountManager } from './AccountManager'
import { contextManager } from './BrowserContextManager'

export class TaskManager {
  private tasks = new Map<string, Record<string, Scheduler>>()
  private logger = createLogger('PageManager')

  constructor() {
    emitter.on('page-closed', ({ accountId }) => {
      const tasks = this.tasks.get(accountId)
      if (tasks) {
        for (const task of Object.values(tasks)) {
          task.stop()
        }
      }
    })
  }

  register(
    taskName: string,
    creator: (page: Page, account: Account) => Scheduler,
  ) {
    const account = accountManager.getActiveAccount()
    const context = contextManager.getContext(account.id)

    let tasks = this.tasks.get(account.id)
    if (!tasks) {
      tasks = {}
      this.tasks.set(account.id, tasks)
    }

    // 任务重复？当前任务正在运行——马上停止

    if (tasks[taskName]?.isRunning) {
      tasks[taskName].stop()
    }

    const task = creator(context.page, account)
    tasks[taskName] = task
  }

  cleanup() {
    for (const tasks of this.tasks.values()) {
      for (const task of Object.values(tasks)) task.stop()
    }
    this.tasks.clear()
  }

  contains(taskName: string) {
    const account = accountManager.getActiveAccount()
    const tasks = this.tasks.get(account.id)
    return tasks && !!tasks[taskName]
  }

  async startTask(taskName: string) {
    const account = accountManager.getActiveAccount()
    const tasks = this.tasks.get(account.id)
    if (tasks?.[taskName].isRunning) {
      this.logger.warn(
        `任务 <${taskName}> 正在运行，无法重新开始 - <${account.name}>`,
      )
      return
    }
    if (tasks) {
      tasks[taskName].start()
      this.logger.info(`启动任务 <${taskName}> - <${account.name}>`)
    }
  }

  stopTask(taskName: string) {
    const account = accountManager.getActiveAccount()
    this.logger.info(`停止任务 <${taskName}> - <${account.name}>`)
    const tasks = this.tasks.get(account.id)
    if (tasks) {
      tasks[taskName].stop()
      delete tasks[taskName]
    }
  }

  updateTaskConfig(taskName: string, newConfig: BaseConfig) {
    const account = accountManager.getActiveAccount()
    const tasks = this.tasks.get(account.id)
    if (tasks) {
      tasks[taskName].updateConfig(newConfig)
    }
  }
}

export const taskManager = new TaskManager()
