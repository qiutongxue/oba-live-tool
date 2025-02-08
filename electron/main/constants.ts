export const LIVE_CONTROL_URL = 'https://fxg.jinritemai.com/ffa/buyin/dashboard/live/control' as const
export const LOGIN_URL = 'https://fxg.jinritemai.com/login/common'
export const LOGIN_URL_REGEX = /.*fxg\.jinritemai\.com\/login\/common.*/
/**
 * 这里根据【直播管理】标签的存在与否判断是否登录成功，因为只有登录状态下才
 * 但是【巨量百应】和【抖音小店】的左侧菜单栏不一样，所以这边需要修改
 */
// FIXME: 需要找到抖店和百应都具备的，也许直接找中控台的元素就行？
export const IS_LOGGED_IN_SELECTOR = `a[href="/ffa/creative/shop-live"]` as const
/**
 * 【直播商品】
 */
export const GOODS_ITEM_SELECTOR = `div[class^="goodsItem"]` as const
/**
 * 一个【直播商品】中的一系列【操作】按钮
 */
export const GOODS_ACTION_SELECTOR = `div[class^="goodsAction"]` as const

// 抖店和百应都有一个【直播中】的tag，可以根据这个tag判断是否正在直播
export const LIVE_TAG_SELECTOR = `span[class^="liveTag"]` as const

/**
 * 未直播时【直播互动】显示的信息
 */
export const NO_LIVE_SELECTOR = `div[class^="noLiveData"]` as const
/**
 * 直播时【直播互动】下方的发送评论区域
 */
export const COMMENT_BLOCK_SELECTOR = `#input-comment-block-id` as const
export const COMMENT_TEXTAREA_SELECTOR = `${COMMENT_BLOCK_SELECTOR} textarea` as const
export const PIN_TOP_SELECTOR = `${COMMENT_BLOCK_SELECTOR} label` as const
export const SUBMIT_COMMENT_SELECTOR = `${COMMENT_BLOCK_SELECTOR} div[class^="inputSuffix"]`

/**
 * 直播互动
 */
export const COMMENT_LIST_WRAPPER = '#comment-list-wrapper'
export const COMMENT_LIST_ITEM = `${COMMENT_LIST_WRAPPER} div[class^="commentItem"]`
