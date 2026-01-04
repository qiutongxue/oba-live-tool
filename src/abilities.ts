import type { AutoReplyConfig } from './hooks/useAutoReplyConfig'

type ListeningSource = AutoReplyConfig['entry']
export const listeningSources: Record<ListeningSource, { name: string; tips: string }> = {
  compass: {
    name: '电商罗盘大屏',
    tips: '电商罗盘大屏监听可以获取评论、点赞、进入直播间等全部消息类型',
  },
  control: {
    name: '中控台',
    tips: '中控台监听只能获取评论消息',
  },
  'wechat-channel': {
    name: '视频号',
    tips: '视频号监听目前暂时只支持用户评论消息',
  },
  xiaohongshu: {
    name: '小红书',
    tips: '小红书监听目前暂时只支持用户评论消息',
  },
  taobao: {
    name: '淘宝',
    tips: '淘宝监听目前暂时只支持用户评论消息',
  },
} as const

type Ability = {
  autoReply?: {
    source: ListeningSource[]
  }
}

export const abilities: Record<LiveControlPlatform, Ability> = {
  douyin: {
    autoReply: {
      source: ['compass', 'control'],
    },
  },
  buyin: {
    autoReply: {
      source: ['compass', 'control'],
    },
  },
  eos: {},
  kuaishou: {},
  wxchannel: {
    autoReply: {
      source: ['wechat-channel'],
    },
  },
  xiaohongshu: {
    autoReply: {
      source: ['xiaohongshu'],
    },
  },
  pgy: {
    autoReply: {
      source: ['xiaohongshu'],
    },
  },
  taobao: {
    autoReply: {
      source: ['taobao'],
    },
  },
  dev: {
    autoReply: {
      source: ['compass', 'control', 'wechat-channel', 'xiaohongshu', 'taobao'],
    },
  },
}

export const autoReplyPlatforms = Object.entries(abilities)
  .filter(([_, s]) => s.autoReply && s.autoReply.source.length > 0)
  .map(([p, _]) => p) as LiveControlPlatform[]
