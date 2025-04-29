export const login: LoginConstants = {
  liveControlUrl: 'https://ark.xiaohongshu.com/live_center_control',
  loginUrl:
    'https://customer.xiaohongshu.com/login?service=https%3A%2F%2Fark.xiaohongshu.com%2Flive_center_control',
  loginUrlRegex: /.*customer\.xiaohongshu\.com\/login.*/,

  isLoggedInSelector: '.user-info-wrapper',
  // isInLiveControlSelector: '.comment-container',
  isInLiveControlSelector: '.app-root-topbar-wrapper',
  hoverSelector: '.user-info-wrapper',
  accountNameSelector: '.sellerId-name',
}

export const selectors = {
  GOODS_ITEM: '.goods-list .table-wrap > div > div > table tbody tr',
  GOODS_ITEMS_WRAPPER: '.goods-list .table-wrap > div > div',
  commentInput: {
    TEXTAREA: '.comment-input textarea',
    SUBMIT_BUTTON: '.comment-input button',
    SUBMIT_BUTTON_DISABLED: 'disabled',
  },
  goodsItem: {
    OPERATION_PANNEL: '.more-operation',
    OPERATION_ITEM: '.operation-item',
    POPUP_BUTTON_TEXT: '弹卡',
    POPUP_BUTTON_DISABLED: 'disabled-btn',
    ID: 'td:first-child input',
  },
} as const
