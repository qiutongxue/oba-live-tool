import type { BrowserSession } from '../types'
import { BaseAdapter } from './BaseAdapter'

export class WechatChannelAdapter extends BaseAdapter {
  async afterLogin(session: BrowserSession) {
    // 微信视频号的弹窗不在中控台，需要额外开启一个页面
    const popup = await session.context.newPage()
    await popup.goto(
      'https://channels.weixin.qq.com/platform/live/commodity/onsale/index',
    )
  }
}
