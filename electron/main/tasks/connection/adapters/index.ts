import * as constants from '#/constants'
import { DefaultAdapter } from './BaseAdapter'
import { KuaishouAdapter } from './KuaishouAdapter'
import { TaobaoAdapter } from './TaobaoAdapter'
import { WechatChannelAdapter } from './WechatChannelAdapter'
import { XiaohongshuAdapter } from './XiaohongshuAdapter'
export function getPlatformAdapter(platform: LiveControlPlatform) {
  const loginConstants = constants[platform].login
  switch (platform) {
    case 'redbook':
      return new XiaohongshuAdapter(loginConstants)
    case 'wxchannel':
      return new WechatChannelAdapter(loginConstants)
    case 'kuaishou':
      return new KuaishouAdapter(loginConstants)
    case 'taobao':
      return new TaobaoAdapter(loginConstants)
    default:
      return new DefaultAdapter(loginConstants)
  }
}
