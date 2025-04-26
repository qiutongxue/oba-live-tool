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
