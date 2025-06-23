export const login: LoginConstants = {
  loginUrl:
    'https://login.taobao.com/havanaone/login/login.htm?bizName=taobao&sub=true&redirectURL=https%3A%2F%2Fliveplatform.taobao.com%2Frestful%2Findex%2Flive%2Flist',
  loginUrlRegex: /.*login\.taobao\.com\/.*/,
  isLoggedInSelector: 'span[class^=header-anchor-name]',
  accountNameSelector: 'span[class^=header-anchor-name]',
  liveControlUrl: 'https://liveplatform.taobao.com/restful/index/live/list', // 这是直播计划，并不是中控台，真正的中控台需要直播中才能访问
  isInLiveControlSelector: 'div.tblalm-lm-content', // 这是直播计划
}

export const selectors = {
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
}
