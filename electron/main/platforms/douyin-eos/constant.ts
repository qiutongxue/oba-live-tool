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

export const TEXTS = {
  POPUP_BUTTON: '讲解',
  POPUP_BUTTON_CANCLE: '取消讲解',
} as const

/**
 * 营销工具（福袋 / 优惠券）相关选择器与文本。
 *
 * ⚠️ 注意：eos 页面的类名有两套前缀（福袋侧 okee-marketing-*，优惠券侧 okee-current-live-*），
 * 且很多类名带 CSS Module 哈希，会随前端发版变化。
 * 因此这里只使用「稳定的前缀 + 文本匹配 + #id」，绝不写死哈希类名。
 */
export const MARKETING = {
  /** 左下角「营销工具」容器（稳定 id） */
  TILE_CONTAINER: '#current-marketing-tool',
  /** 页面内弹窗（Drawer）相关 */
  DRAWER_DIALOG: '[class*="drawer-dialog"]',
  DRAWER_CLOSE: '[class*="drawer-close-icon"]',
  DRAWER_MASK: '[class*="drawer-mask-show"]',
  /** 表格数据行 */
  TABLE_ROW: 'table tbody tr',

  GIFT_BAG: {
    /** 磁贴名称 */
    TILE: '福袋',
    /** 弹窗就绪标志：出现「创建福袋」按钮 */
    MODAL_READY: 'button:has-text("创建福袋")',
    /** 行内「复制」是 div（非 button），需用文本精确匹配 */
    COPY_TEXT: '复制',
    /** 表单就绪标志 */
    FORM_READY: 'button:has-text("提交审核")',
    SUBMIT: 'button:has-text("提交审核")',
    CANCEL: 'button:has-text("取消")',
    /** 操作列 / 发放时间列（aria-colindex） */
    COL_SEND_TIME: 5,
    COL_ACTION: 6,
  },

  COUPON: {
    TILE: '优惠券',
    MODAL_READY: 'button:has-text("创建优惠券")',
    SEND_BUTTON: 'button:has-text("发放优惠券")',
    STOP_BUTTON: 'button:has-text("停止发券")',
    /** 发券弹窗就绪标志 */
    DIALOG_READY: 'button:has-text("确定发放")',
    CONFIRM: 'button:has-text("确定发放")',
    CANCEL: 'button:has-text("取消")',
    COL_NAME: 1,
    COL_STATUS: 2,
    COL_AMOUNT: 4,
    COL_TOTAL_STOCK: 5,
    COL_AVAILABLE_STOCK: 6,
    COL_ACTION: 9,
  },
} as const
