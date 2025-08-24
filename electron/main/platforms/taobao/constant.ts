export const URLS = {
  LOGIN_PAGE:
    'https://login.taobao.com/havanaone/login/login.htm?bizName=taobao&sub=true&redirectURL=https%3A%2F%2Fliveplatform.taobao.com%2Frestful%2Findex%2Flive%2Flist',
  /** 淘宝需要从直播计划进入中控台 */
  LIVE_LIST: 'https://liveplatform.taobao.com/restful/index/live/list', // 这是直播计划，并不是中控台，真正的中控台需要直播中才能访问
  LIVE_CONTROL_WITH_ID:
    'https://liveplatform.taobao.com/restful/index/live/control?liveId=', // 后面的 liveId 需要动态获取
} as const

export const REGEXPS = {
  LOGIN_PAGE: /.*login\.taobao\.com\/.*/,
}

export const SELECTORS = {
  LOGGED_IN: 'span[class^=header-anchor-name]',
  ACCOUNT_NAME: 'span[class^=header-anchor-name]',
  IN_LIVE_LIST: 'div.tblalm-lm-content', // 这是直播计划
  LIVE_ID:
    '#scrollableDiv .tblalm-lm-list-item-live.online .tblalm-lm-list-item-live-subTitle-id .tui-number-figure',
  GOODS_ITEM: '#livePushed-tcl-unique-scroll-list .list-item',
  GOODS_ITEMS_WRAPPER: '#tcl-unique-virtual-list',
  commentInput: {
    TEXTAREA: '#comment-page > div.tc-comment-reply > textarea',
    SUBMIT_BUTTON:
      '#comment-page > div.tc-comment-reply > div.tc-comment-reply-footer > div.tc-comment-reply-publish-button > button',
  },
  goodsItem: {
    ID: 'div.list-item-img-index',
    POPUP_BUTTON: 'button[data-tblalog-id="tanPin"]', // button[data-tblalog-id="jiangJie"]
  },
  overlays: {
    DRIVER: '#driver-highlighted-element-stage-overlay',
  },
} as const
