export const URLS = {
  LIVE_CONTROL: 'https://eos.douyin.com/livesite/live/current',
  LOGIN_PAGE: 'https://eos.douyin.com/livesite/login',
} as const

export const REGEXPS = {
  LOGIN_PAGE: /.*eos\.douyin\.com\/livesite\/login.*/,
}

export const SELECTORS = {
  LOGGED_IN: `[class^="head-container"]`,
  IN_LIVE_CONTROL: `[class^="layout-container"]`,
  ACCOUNT_NAME: `[class^="profile-container"]`,

  GOODS_ITEM: '#live-card-list div[class^="render-item"]',
  GOODS_ITEMS_WRAPPER: '#live-card-list > div > div',
  commentInput: {
    TEXTAREA: 'textarea[class^="input"]',
    SUBMIT_BUTTON: 'div[class^="comment-wrap"] div[class^="button"]',
  },
  goodsItem: {
    POPUP_BUTTON: '[class^="talking-btn"]',
    ID: 'input',
  },
} as const
