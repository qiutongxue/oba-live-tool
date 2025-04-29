export const login: LoginConstants = {
  liveControlUrl: 'https://buyin.jinritemai.com/dashboard/live/control',
  loginUrl: 'https://buyin.jinritemai.com/mpa/account/login?log_out=1&type=24',
  loginUrlRegex: /douyinec\.com/,
  isLoggedInSelector: `[class^="header"]`,
  isInLiveControlSelector: `[class^="goodsPanel"]`,
  accountNameSelector: 'span.btn-item-role-exchange-name__title',
}
