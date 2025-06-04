import { sleep } from '#/utils'
import type { BrowserSession } from '../types'
import { BaseAdapter } from './BaseAdapter'

export class KuaishouAdapter extends BaseAdapter {
  async afterLogin(session: BrowserSession) {
    // 快手小店会弹出莫名其妙的窗口，按 ESC 关闭
    await Promise.race([
      session.page.waitForSelector('#driver-page-overlay'),
      sleep(5000),
    ])
    while (await session.page.$('#driver-page-overlay')) {
      await session.page.press('body', 'Escape')
      await sleep(1000)
    }
  }
}
