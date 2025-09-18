// export const login: LoginConstants = {
//   liveControlUrl: 'https://ark.xiaohongshu.com/live_center_control',
//   loginUrl:
//     'https://customer.xiaohongshu.com/login?service=https%3A%2F%2Fark.xiaohongshu.com%2Flive_center_control',
//   loginUrlRegex: /.*customer\.xiaohongshu\.com\/login.*/,

//   isLoggedInSelector: '.user-info-wrapper',
//   // isInLiveControlSelector: '.comment-container',
//   isInLiveControlSelector: '.app-root-topbar-wrapper',
//   hoverSelector: '.user-info-wrapper',
//   accountNameSelector: '.sellerId-name',
// }

export const URLS = {
  LOGIN_PAGE:
    'https://customer.xiaohongshu.com/login?service=https%3A%2F%2Fark.xiaohongshu.com%2Flive_center_control',
  LIVE_CONTROL_PAGE: 'https://ark.xiaohongshu.com/live_center_control',
} as const

export const REGEXPS = {
  LOGIN_PAGE: /.*customer\.xiaohongshu\.com\/login.*/,
}

export const SELECTORS = {
  LOGGED_IN: '.user-info-wrapper',
  IN_LIVE_CONTROL: '.app-root-topbar-wrapper',

  ACCOUNT_NAME_HOVER: '.user-info-wrapper',
  ACCOUNT_NAME: '.sellerId-name',

  GOODS_ITEM: '.goods-list .table-wrap > div > div > table tbody tr',
  GOODS_ITEMS_WRAPPER: '.goods-list .table-wrap > div > div',

  COMMENT_INPUT: {
    TEXTAREA: '.comment-input textarea',
    SUBMIT_BUTTON: '.comment-input button',
    SUBMIT_BUTTON_DISABLED: 'disabled',
  },

  GOODS_ITEM_INNER: {
    OPERATION_PANNEL: '.more-operation',
    OPERATION_ITEM: '.operation-item',
    POPUP_BUTTON_DISABLED: 'disabled-btn',
    ID: 'td:first-child input',
  },
} as const

export const TEXTS = {
  POPUP_BUTTON_TEXT: '弹卡',
} as const
