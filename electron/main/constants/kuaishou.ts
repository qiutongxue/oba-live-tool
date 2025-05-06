// 快手第一次登录会有莫名其妙的玩意，需要关闭：
// #driver-popover-item > div.driver-clearfix.driver-popover-footer > button
export const login: LoginConstants = {
  accountNameSelector: '[class^=nickname] [class^=name]',
  liveControlUrl: 'https://zs.kwaixiaodian.com/page/helper',
  loginUrl:
    'https://login.kwaixiaodian.com/?biz=merchantLivePc&redirect_url=https%3A%2F%2Fzs.kwaixiaodian.com%2Fpage%2Fhelper',
  loginUrlRegex: /login\.kwaixiaodian\.com\//,
  isLoggedInSelector: '[class^=nickname] [class^=name]',
  isInLiveControlSelector: 'div[class^=live-panel]',
}
