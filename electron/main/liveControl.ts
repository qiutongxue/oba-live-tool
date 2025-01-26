import fs from 'fs-extra'
import playwright from 'playwright'
import { GOODS_ITEM_SELECTOR, IS_LOGGED_IN_SELECTOR, LIVE_CONTROL_URL } from './constants'
import { createLogger } from './logger'

export async function connectLiveControl() {
  const logger = createLogger('browser')

  logger.info('启动中……')
  const browser = await playwright.chromium.launch({
    headless: false,
    executablePath: 'C:\\Users\\qbw\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  })

  logger.info('已连接到浏览器')
  const context = await browser.newContext()
  const page = await context.newPage()

  // 加载 cookies
  try {
    const cookiesString = await fs.readFile('cookies', 'utf8')
    const cookies = JSON.parse(cookiesString)
    await context.addCookies(cookies)
  }
  catch {
    logger.warn('读取 cookies 失败')
  }

  await page.goto(LIVE_CONTROL_URL)

  // 等待登录
  await page.waitForSelector(IS_LOGGED_IN_SELECTOR, { timeout: 0 })
  logger.info('已登录')

  const cookies = await context.cookies()
  await fs.writeFile('cookies', JSON.stringify(cookies))

  // 等待中控台页面加载完成
  await page.waitForSelector(GOODS_ITEM_SELECTOR, { timeout: 0 })

  return { browser, page }
}
