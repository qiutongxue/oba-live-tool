export const login: LoginConstants = {
  liveControlUrl: 'https://eos.douyin.com/livesite/live/current',
  loginUrl: 'https://eos.douyin.com/livesite/login',
  loginUrlRegex: /.*eos\.douyin\.com\/livesite\/login.*/,
  isLoggedInSelector: `[class^="head-container"]`,
  isInLiveControlSelector: `[class^="layout-container"]`,
  accountNameSelector: `[class^="profile-container"]`,
}

export const selectors = {
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
