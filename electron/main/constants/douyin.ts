export const login: LoginConstants = {
  liveControlUrl: 'https://fxg.jinritemai.com/ffa/buyin/dashboard/live/control',
  loginUrl:
    'https://fxg.jinritemai.com/login/common?extra=%7B%22target_url%22%3A%22https%3A%2F%2Ffxg.jinritemai.com%2Fffa%2Fbuyin%2Fdashboard%2Flive%2Fcontrol%22%7D',
  loginUrlRegex: /.*fxg\.jinritemai\.com\/login\/common.*/,
  isLoggedInSelector: `[class^="username"]`,
  isInLiveControlSelector: `[class^="goodsPanel"]`,
  accountNameSelector: `[class^="index_userName"]`,
}

export const selectors = {
  GOODS_ITEM: 'div[class^="goodsItem"]',
  GOODS_ITEMS_WRAPPER: '#live-control-goods-list-container div',
  goodsItem: {
    ACTION: 'div[class^="goodsAction"]',
    POPUP_BUTTON: 'div[class*="wrapper"]:has(button) button',
    ID: 'div[class^="indexWrapper"] input',
  },
  commentInput: {
    TEXTAREA: '#input-comment-block-id textarea',
    SUBMIT_BUTTON: '#input-comment-block-id div[class^="inputSuffix"]',
    SUBMIT_BUTTON_DISABLED: 'isDisabled',
    /** 置顶的勾选框 */
    PIN_TOP_LABEL: '#input-comment-block-id label',
  },
  overlays: {
    /** 长时间不操作弹窗的关闭按钮 */
    AFK_CLOSE_BUTTON:
      'div.auxo-modal-content > div > div > div.auxo-modal-confirm-btns > button.auxo-btn.auxo-btn-primary',
    /** 直播结束后弹出的【直播总结】的关闭按钮 */
    LIVE_OVER_CLOSE_BUTTON:
      'div.auxo-modal-content svg[class^="liveOverCloseIcon"]',
  },
} as const

/**
 * 【直播商品】
 */
// export const GOODS_ITEM_SELECTOR = `div[class^="goodsItem"]` as const
/**
 * 一个【直播商品】中的一系列【操作】按钮
 */
// export const GOODS_ACTION_SELECTOR = `div[class^="goodsAction"]` as const

// 抖店和百应都有一个【直播中】的tag，可以根据这个tag判断是否正在直播
// export const LIVE_TAG_SELECTOR = `span[class^="liveTag"]` as const

/**
 * 未直播时【直播互动】显示的信息
 */
// export const NO_LIVE_SELECTOR = `div[class^="noLiveData"]` as const

/**
 * 直播时【直播互动】下方的发送评论区域
 */
// export const COMMENT_BLOCK_SELECTOR = '#input-comment-block-id' as const
// export const COMMENT_TEXTAREA_SELECTOR =
//   `${COMMENT_BLOCK_SELECTOR} textarea` as const
// export const PIN_TOP_SELECTOR = `${COMMENT_BLOCK_SELECTOR} label` as const
// export const SUBMIT_COMMENT_SELECTOR = `${COMMENT_BLOCK_SELECTOR} div[class^="inputSuffix"]`

/**
 * 直播互动
 */
// export const COMMENT_LIST_WRAPPER = '#comment-list-wrapper'
// export const COMMENT_LIST_ITEM = `${COMMENT_LIST_WRAPPER} div[class^="commentItem"]`

/**
 * 恢复直播按钮
 */
// export const RECOVERY_BUTTON_SELECTOR =
//   'div.auxo-modal-content > div > div > div.auxo-modal-confirm-btns > button.auxo-btn.auxo-btn-primary'

/**
 * 直播结束后弹出的【直播总结】的关闭按钮
 */
// export const LIVE_OVER_CLOSE_SELECTOR =
//   'div.auxo-modal-content svg[class^="liveOverCloseIcon"]'
