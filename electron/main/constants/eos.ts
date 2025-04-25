/**
 * 抖音生活服务（抖音团购）
 */

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
