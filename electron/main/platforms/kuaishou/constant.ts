// 快手第一次登录会有莫名其妙的玩意，需要关闭：
// #driver-popover-item > div.driver-clearfix.driver-popover-footer > button

export const URLS = {
  LIVE_CONTROL: 'https://zs.kwaixiaodian.com/page/helper',
  LOGIN_PAGE:
    'https://login.kwaixiaodian.com/?biz=merchantLivePc&redirect_url=https%3A%2F%2Fzs.kwaixiaodian.com%2Fpage%2Fhelper',
} as const

export const REGEXPS = {
  LOGIN_PAGE: /login\.kwaixiaodian\.com\//,
}

export const SELECTORS = {
  ACCOUNT_NAME: '[class^=nickname] [class^=name]',
  LOGGED_IN: '[class^=nickname] [class^=name]',
  IN_LIVE_CONTROL: 'div[class^=live-panel]',
  DRIVER_POPOVER: '#driver-page-overlay',

  GOODS_ITEM: '[class^=list-container] [class^=list-item]',
  GOODS_ITEMS_WRAPPER: '[class^=list-container] [data-virtuoso-scroller]',
  goodsItem: {
    ID: 'input',
    POPUP_BUTTON: '[class^=cardBtn] > button:last-child',
    // 若有正在弹窗的商品，不管是结束弹窗还是开始弹窗都会弹出一个 modal
    // 需要点击 modal 上的确认按钮才能执行下一步操作
    POPUP_CONFIRM_BUTTON: '.ant-modal-root button:last-child',
  },
  CLOSE_VIDEO_BTN: '[class^=live-panel] [class^=btn] > div:first-child',
  VIDEO: '[class^=video-container]',
  commentInput: {
    TEXTAREA: 'div[class^=reply-content] input[type=text]',
    PIN_TOP_LABEL: 'div[class^=reply-content] label',
    SUBMIT_BUTTON: 'div[class^=reply-content] button',
  },
  overlays: {
    // 刚进中控台弹出的：团购模式全新上线，选择暂不切换（第一个按钮）
    SWITCH_TO_GROUP_BUYING: '.ant-modal-root button',
    // 开启直播后，中控台会弹出窗口：已开启直播，选择我知道了（唯一一个按钮（
    LIVE_ON: '.ant-modal-root button',
  },
} as const
