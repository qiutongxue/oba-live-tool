import type { Browser, Page } from 'playwright'
import type { createAutoMessage } from './tasks/autoMessage'
import type { createAutoPopUp } from './tasks/autoPopUp'
import type { BaseConfig, Scheduler } from './tasks/scheduler'
import { createLogger } from './logger'

export class TaskManager {
  private static instance: TaskManager
  private browser: Browser | null = null
  private page: Page | null = null
  private logger = createLogger('PageManager')
  private autoMessage: ReturnType<typeof createAutoMessage> | null = null
  private autoPopUp: ReturnType<typeof createAutoPopUp> | null = null
  private tasks: Record<string, Scheduler> = {}
  private constructor() {}

  static getInstance() {
    if (!TaskManager.instance)
      TaskManager.instance = new TaskManager()
    return TaskManager.instance
  }

  setBrowser(browser: Browser) {
    this.browser = browser
  }

  setPage(page: Page) {
    this.page = page
  }

  getPage() {
    if (!this.page)
      throw new Error('Page not initialized')
    return this.page
  }

  register(taskName: string, creator: (args: any, userConfig?: BaseConfig) => Scheduler, userConfig?: BaseConfig) {
    const scheduler = creator(this.page, userConfig)
    this.tasks[taskName] = scheduler
  }

  cleanup() {
    for (const task of Object.values(this.tasks))
      task.stop()
    this.tasks = {}
  }

  startTask(taskName: string) {
    if (!this.tasks[taskName])
      throw new Error(`Task ${taskName} not found`)
    this.tasks[taskName].start()
  }

  stopTask(taskName: string) {
    if (!this.tasks[taskName])
      throw new Error(`Task ${taskName} not found`)
    this.tasks[taskName].stop()
  }
}

export const pageManager = TaskManager.getInstance()
