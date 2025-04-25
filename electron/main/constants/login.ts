export interface LoginConstants {
  liveControlUrl: string
  loginUrl: string
  loginUrlRegex: RegExp
  isLoggedInSelector: string
  isInLiveControlSelector: string
  accountNameSelector: string
  hoverSelector?: string
}

export const loginConstants: Record<LiveControlPlatform, LoginConstants> = {
  buyin: {
    liveControlUrl: 'https://buyin.jinritemai.com/dashboard/live/control',
    loginUrl:
      'https://buyin.jinritemai.com/mpa/account/login?log_out=1&type=24',
    loginUrlRegex: /douyinec\.com/,
    isLoggedInSelector: `[class^="header"]`,
    isInLiveControlSelector: `[class^="goodsPanel"]`,
    accountNameSelector: 'span.btn-item-role-exchange-name__title',
  },
  douyin: {
    liveControlUrl:
      'https://fxg.jinritemai.com/ffa/buyin/dashboard/live/control',
    loginUrl:
      'https://fxg.jinritemai.com/login/common?extra=%7B%22target_url%22%3A%22https%3A%2F%2Ffxg.jinritemai.com%2Fffa%2Fbuyin%2Fdashboard%2Flive%2Fcontrol%22%7D',
    loginUrlRegex: /.*fxg\.jinritemai\.com\/login\/common.*/,
    isLoggedInSelector: `[class^="username"]`,
    isInLiveControlSelector: `[class^="goodsPanel"]`,
    accountNameSelector: `[class^="index_userName"]`,
  },
  eos: {
    liveControlUrl: 'https://eos.douyin.com/livesite/live/current',
    loginUrl: 'https://eos.douyin.com/livesite/login',
    loginUrlRegex: /.*eos\.douyin\.com\/livesite\/login.*/,
    isLoggedInSelector: `[class^="head-container"]`,
    isInLiveControlSelector: `[class^="layout-container"]`,
    accountNameSelector: `[class^="profile-container"]`,
  },
  redbook: {
    liveControlUrl: 'https://ark.xiaohongshu.com/live_center_control',
    loginUrl:
      'https://customer.xiaohongshu.com/login?service=https%3A%2F%2Fark.xiaohongshu.com%2Flive_center_control',
    loginUrlRegex: /.*customer\.xiaohongshu\.com\/login.*/,

    isLoggedInSelector: '.user-info-wrapper',
    // isInLiveControlSelector: '.comment-container',
    isInLiveControlSelector: '.app-root-topbar-wrapper',
    hoverSelector: '.user-info-wrapper',
    accountNameSelector: '.sellerId-name',
  },
  wxchannel: {
    liveControlUrl: 'https://channels.weixin.qq.com/platform/live/liveBuild',
    loginUrl: 'https://channels.weixin.qq.com/login.html',
    loginUrlRegex: /.*channels\.weixin\.qq\.com\/login/,
    isLoggedInSelector: '.account-info .name',
    isInLiveControlSelector: '.live-message-input-container', // 评论框
    accountNameSelector: '.account-info .name',
  },
} as const
