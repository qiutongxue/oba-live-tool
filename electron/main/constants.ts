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
// export const BUYIN_LIVE_CONTROL_URL = 'https://buyin.jinritemai.com/dashboard/live/control' as const
// export const BUYIN_LOGIN_URL = 'https://buyin.jinritemai.com/login/common' as const
// export const ACCOUNT_NAME_SELECTOR = `[class^="index_userName"]` as const
/**
 * 这里根据【直播管理】标签的存在与否判断是否登录成功，因为只有登录状态下才
 * 但是【巨量百应】和【抖音小店】的左侧菜单栏不一样，所以这边需要修改
 */
// FIXME: 需要找到抖店和百应都具备的，也许直接找中控台的元素就行？[class^="goodsPanel"]
// 有可能会碰到右上角显示不出登录信息或左边sidebar没显示的情况，所以直接采用主页面内的元素：直播中控四个大字
// export const IS_LOGGED_IN_SELECTOR = `[class^="username"]`
// export const IS_LOGGED_IN_SELECTOR = ACCOUNT_NAME_SELECTOR
// export const IS_LOGGED_IN_SELECTOR = `a[href="/ffa/creative/shop-live"]` as const
/**
 * 【直播商品】
 */
export const GOODS_ITEM_SELECTOR = `div[class^="goodsItem"]` as const
/**
 * 一个【直播商品】中的一系列【操作】按钮
 */
export const GOODS_ACTION_SELECTOR = `div[class^="goodsAction"]` as const

// 抖店和百应都有一个【直播中】的tag，可以根据这个tag判断是否正在直播
export const LIVE_TAG_SELECTOR = `span[class^="liveTag"]` as const

/**
 * 未直播时【直播互动】显示的信息
 */
export const NO_LIVE_SELECTOR = `div[class^="noLiveData"]` as const
/**
 * 直播时【直播互动】下方的发送评论区域
 */
export const COMMENT_BLOCK_SELECTOR = '#input-comment-block-id' as const
export const COMMENT_TEXTAREA_SELECTOR =
  `${COMMENT_BLOCK_SELECTOR} textarea` as const
export const PIN_TOP_SELECTOR = `${COMMENT_BLOCK_SELECTOR} label` as const
export const SUBMIT_COMMENT_SELECTOR = `${COMMENT_BLOCK_SELECTOR} div[class^="inputSuffix"]`

/**
 * 直播互动
 */
export const COMMENT_LIST_WRAPPER = '#comment-list-wrapper'
export const COMMENT_LIST_ITEM = `${COMMENT_LIST_WRAPPER} div[class^="commentItem"]`

/**
 * 恢复直播按钮
 */
export const RECOVERY_BUTTON_SELECTOR =
  'div.auxo-modal-content > div > div > div.auxo-modal-confirm-btns > button.auxo-btn.auxo-btn-primary'

/**
 * 直播结束后弹出的【直播总结】的关闭按钮
 */
export const LIVE_OVER_CLOSE_SELECTOR =
  'div.auxo-modal-content svg[class^="liveOverCloseIcon"]'
