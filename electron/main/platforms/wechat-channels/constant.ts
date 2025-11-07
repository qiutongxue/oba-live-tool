// export const login: LoginConstants = {
//   liveControlUrl: 'https://channels.weixin.qq.com/platform/live/liveBuild',
//   loginUrl: 'https://channels.weixin.qq.com/login.html',
//   loginUrlRegex: /.*channels\.weixin\.qq\.com\/login/,
//   isLoggedInSelector: '.account-info .name',
//   isInLiveControlSelector: '.live-message-input-container', // 评论框
//   accountNameSelector: '.account-info .name',
// } as const

export const URLS = {
  /** 中控台页面 */
  LIVE_CONTROL_PAGE: 'https://channels.weixin.qq.com/platform/live/liveBuild',
  /** 登录页面 */
  LOGIN_PAGE: 'https://channels.weixin.qq.com/login.html',
  /** 商品页面 */
  PRODUCTS_PAGE:
    'https://channels.weixin.qq.com/platform/live/commodity/onsale/index',
} as const

export const REGEXPS = {
  /** 视频号商家首页 */
  INDEX_PAGE: /platform\/?$/,
  /** 登录页 */
  LOGIN_PAGE: /.*channels\.weixin\.qq\.com\/login/,
} as const

export const SELECTORS = {
  LOGIN: {
    /** 已登录状态 */
    LOGGED_IN: '.account-info .name',
    /** 进入中控台成功 */
    IN_LIVE_CONTROL: '.live-message-input-container', // 评论框
  },
  /** 获取用户名的元素 */
  ACCOUNT_NAME: '.account-info .name',
  GOODS_ITEM:
    '.commodity-list-wrap .table-body-wrap > div > span div.table-row-wrap',
  /** 视频号中控台在 iframe 里，要先获取 iframe 才能定位其余元素 */
  LIVE_CONTROL_IFRAME: '.wujie_iframe',
  overlays: {
    /** 关闭商品页面偶尔弹出的弹窗 “直播间讲解支持「送礼物」模式” 的按钮 */
    CLOSE_BUTTON: '.weui-desktop-dialog button[class*="close-btn"]',
  },
  goodsItem: {
    POPUP_BUTTON: '.promoting-wrap .action-link span[class*="promoting"]',
    ID: 'input + span',
  },
  commentInput: {
    TEXTAREA: '.live-message-input-container textarea',
    SUBMIT_BUTTON: '.live-message-input-container button',
    SUBMIT_BUTTON_DISABLED: 'disabled',
  },
} as const

export const TEXT = {
  POPUP_BUTTON_CANCLE: '结束讲解',
  POPUP_BUTTON: '讲解',
} as const
