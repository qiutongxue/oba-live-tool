import { sleep } from '#/utils'
import type { BrowserSession } from '../types'
import { BaseAdapter } from './BaseAdapter'

export class TaobaoAdapter extends BaseAdapter {
  async afterLogin(session: BrowserSession): Promise<void> {
    // 淘宝需要在直播计划中获取到直播间 id，再通过 id 进入中控台
    const liveIdWrapper = await session.page.waitForSelector(
      '#scrollableDiv .tblalm-lm-list-item-live.online .tblalm-lm-list-item-live-subTitle-id .tui-number-figure',
      {
        timeout: 5000,
      },
    )
    if (!liveIdWrapper) {
      // 未找到直播间的 id， 说明并没有在直播
      throw new Error('找不到直播间 ID，请确认是否正在直播')
    }
    const liveId = await liveIdWrapper.textContent()
    const liveControlUrl = `https://liveplatform.taobao.com/restful/index/live/control?liveId=${liveId}`
    await session.page.goto(liveControlUrl)

    // 淘宝会弹出莫名其妙的引导界面，按 ESC 关闭
    const driverOverlay = '#driver-highlighted-element-stage-overlay'
    await Promise.race([
      session.page.waitForSelector(driverOverlay),
      sleep(3000),
    ])
    while (await session.page.$(driverOverlay)) {
      await session.page.press('body', 'Escape')
      await sleep(500)
    }
  }
}
