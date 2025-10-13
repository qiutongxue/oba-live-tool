export const URLS = {
  LOGIN_PAGE: 'https://pgy.xiaohongshu.com',
  LIVE_CONTROL_PAGE:
    'https://pgy.xiaohongshu.com/commerce/redlive/live_center_control',
  INDEX_PAGE: 'https://pgy.xiaohongshu.com/microapp/selection/buyer_home',
} as const

export const REGEXPS = {
  LOGIN_PAGE: /pgy\.xiaohongshu\.com\/?$/,
}

export const SELECTORS = {
  LOGIN_BUTTON: 'button.login-btn',
  LOGGED_IN:
    '.top-bar-right-user-item .top-bar-right-user-item-info .top-bar-right-user-item-info-name',
  IN_LIVE_CONTROL: '#redlive-pgy-app .control-container',
  ACCOUNT_NAME:
    '.top-bar-right-user-item .top-bar-right-user-item-info .top-bar-right-user-item-info-name',
} as const
