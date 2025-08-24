import { SELECTORS as DY_SELECTORS } from '../douyin/constant'

export const URLS = {
  LIVE_CONTROL_PAGE: 'https://buyin.jinritemai.com/dashboard/live/control',
  LOGIN_PAGE:
    'https://buyin.jinritemai.com/mpa/account/login?log_out=1&type=24',
}

export const REGEXPS = {
  LOGIN_PAGE: /douyinec\.com/,
}

export const SELECTORS = {
  ...DY_SELECTORS,
  LOGGED_IN: '[class^="header"]',
  IN_LIVE_CONTROL: '[class^="goodsPanel"]',
  ACCOUNT_NAME: 'span.btn-item-role-exchange-name__title',
} as const
