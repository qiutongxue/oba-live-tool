import { BuyinPlatform } from './buyin'
import { DevPlatform } from './dev'
import { DouyinPlatform } from './douyin'
import { DouyinEosPlatform } from './douyin-eos'
import type { IPlatform } from './IPlatform'
import { KuaishouPlatform } from './kuaishou'
import { TaobaoPlatform } from './taobao'
import { WechatChannelPlatform } from './wechat-channels'
import { XiaohongshuPlatform } from './xiaohongshu'
import { XiaohongshuPgyPlatform } from './xiaohongshu-pgy'

export const platformFactory: Record<LiveControlPlatform, { new (): IPlatform }> = {
  buyin: BuyinPlatform,
  douyin: DouyinPlatform,
  xiaohongshu: XiaohongshuPlatform,
  wxchannel: WechatChannelPlatform,
  taobao: TaobaoPlatform,
  kuaishou: KuaishouPlatform,
  eos: DouyinEosPlatform,
  dev: DevPlatform,
  pgy: XiaohongshuPgyPlatform,
}
