import type { BrowserSession } from '#/tasks/connection/types'
import type { IPlatform } from '../IPlatform'

const PLATFORM_NAME = '测试平台' as const

export class DevPlatform implements IPlatform {
  get platformName() {
    return PLATFORM_NAME
  }

  connect(_browserSession: BrowserSession): Promise<boolean> {
    return Promise.resolve(true)
  }

  login(_browserSession: BrowserSession): Promise<void> {
    return Promise.resolve()
  }

  getAccountName(_session: BrowserSession): Promise<string> {
    return Promise.resolve('测试')
  }

  disconnect(): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
