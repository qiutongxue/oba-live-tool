import { pageManager } from '#/taskManager'
import { ipcMain } from 'electron'
import fs from 'fs-extra'
import playwright from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { GOODS_ITEM_SELECTOR, IS_LOGGED_IN_SELECTOR, LIVE_CONTROL_URL, LOGIN_URL, LOGIN_URL_REGEX } from '../constants'
import { createLogger } from '../logger'
import { findChrome } from '../utils/checkChrome'

const logger = createLogger('中控台')
let chromePath: string | null = null

async function createBrowser(headless = true) {
  // TODO: 这里需要改成从配置文件中读取 appConfig.json
  if (!chromePath) {
    chromePath = await findChrome()
    if (!chromePath)
      throw new Error('未找到 Chrome 浏览器')
  }

  return playwright.chromium.launch({
    headless,
    executablePath: chromePath,
  })
}

async function loadCookies(context: playwright.BrowserContext) {
  try {
    const cookiesString = await fs.readFile('cookies', 'utf8')
    const cookies = JSON.parse(cookiesString)
    await context.addCookies(cookies)
    return true
  }
  catch {
    return false
  }
}

async function saveCookies(context: playwright.BrowserContext) {
  const cookies = await context.cookies()
  await fs.writeFile('cookies', JSON.stringify(cookies))
}

(function registerListeners() {
  ipcMain.handle(IPC_CHANNELS.tasks.liveControl.connect, async (event, { chromePath: path, headless }) => {
    try {
      chromePath = path
      const { browser, page } = await connectLiveControl({ headless })

      // 保存到 PageManager
      pageManager.setBrowser(browser)
      pageManager.setPage(page)

      return { success: true }
    }
    catch (error) {
      logger.error('连接直播控制台失败:', (error as Error).message)
      return { success: false }
    }
  })
})()

export async function connectLiveControl({ headless = true }) {
  logger.info('启动中……')
  let loginSuccess = false
  let browser: playwright.Browser | null = null
  let page: playwright.Page | null = null
  while (!loginSuccess) {
    // 1. 先尝试无头模式
    browser = await createBrowser(headless)
    let context = await browser.newContext()
    page = await context.newPage()

    // 加载 cookies
    const hasCookies = await loadCookies(context)
    if (!hasCookies)
      logger.debug('读取 cookies 失败')

    // 访问中控台
    await page.goto(LIVE_CONTROL_URL)
    await Promise.race([
      // 登录页面
      page.waitForURL(LOGIN_URL_REGEX, { timeout: 0 }),
      // 登录成功后的中控台
      page.waitForSelector(IS_LOGGED_IN_SELECTOR, { timeout: 0 }),
    ])
    logger.debug(`当前的页面为：${page.url()}}`)
    // 2. 检查是否需要登录
    if (page.url().startsWith(LOGIN_URL)) {
      logger.info('需要登录，请在打开的浏览器中完成登录')
      if (headless) {
        // 关闭当前浏览器
        await browser.close()

        // 启动有头模式
        browser = await createBrowser(false)
        context = await browser.newContext()
        page = await context.newPage()

        // 直接访问登录页
        await page.goto(LOGIN_URL)
      }

      // 3. 等待用户登录成功
      await page.waitForSelector(IS_LOGGED_IN_SELECTOR, { timeout: 0 })

      // 保存 cookies
      await saveCookies(context)
      if (headless) {
        // 关闭有头浏览器
        await browser.close()
      }
    }
    else {
      loginSuccess = true
    }
  }

  // 等待中控台页面加载完成
  await page!.waitForSelector(GOODS_ITEM_SELECTOR, { timeout: 0 })
  logger.success('登录成功')

  return { browser: browser!, page: page! }
}
