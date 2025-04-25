/**
 * 商品页面
 */
export const GOODS_PAGE_URL =
  'https://channels.weixin.qq.com/platform/live/commodity/onsale/index'

export const selectors = {
  GOODS_ITEM:
    '.commodity-list-wrap .table-body-wrap > div > span div.table-row-wrap',
  /** 视频号中控台在 iframe 里，要先获取 iframe 才能定位其余元素 */
  LIVE_CONTROL_IFRAME: '.wujie-iframe',
  overlays: {
    /** 关闭商品页面偶尔弹出的弹窗 “直播间讲解支持「送礼物」模式” 的按钮 */
    CLOSE_BUTTON: '.weui-desktop-dialog button[class*="close-btn"]',
  },
  goodsItem: {
    POPUP_BUTTON: '.promoting',
    ID: 'input + span',
  },
  commentInput: {
    TEXTAREA: '.live-message-input-container textarea',
    SUBMIT_BUTTON: '.live-message-input-container button',
    SUBMIT_BUTTON_DISABLED: 'disabled',
  },
} as const
