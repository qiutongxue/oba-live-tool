import fs from 'fs-extra'
import playwright from 'playwright'
import { GOODS_ITEM_SELECTOR, IS_LOGGED_IN_SELECTOR, LIVE_CONTROL_URL, LIVE_TAG_SELECTOR } from './constants'
import { createLogger } from './logger'
import { createAutoMessage } from './tasks/autoMessage'
import { createAutoPopUp } from './tasks/autoPopUp'
import { createTaskManager } from './tasks/taskManager'

const MESSAGES = [
  `亲，买欧芭认准黑标官方旗舰店，我们就在欧芭总部直播，瓶身后是有防伪码，假一罚四！`,
  `直播间右上角入会领取19元优惠券，1号链接到手价仅166元!`,
  `中干性发质1号,头顶油发尾干2号,油性发质3号,头屑止痒4号`,
  `@*** 姐姐感谢支持咱们欧芭正品，小助理这边马上为姐姐备注加急发货嘞~`,
]

// 添加配置接口
interface StartConfig {
  autoMessage?: {
    messages: string[]
    interval: [number, number]
    pinTops: number[]
    random: boolean
  }
  autoPopUp?: {
    goodsIds: number[]
    interval: [number, number]
    random: boolean
  }
}

async function start(config?: StartConfig) {
  ;(async () => {
    const logger = createLogger('main')

    logger.info('启动中……')
    const browser = await playwright.chromium.launch({
      headless: false,
      executablePath: 'C:\\Users\\qbw\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    })
    logger.info('已连接到浏览器')
    // const browser = await playwright.chromium.launch({
    //   headless: false,
    // })
    // console.log(browser.contexts()[0])
    const context = await browser.newContext({
      viewport: {
        width: 1280,
        height: 800,
      },
    })
    // browser.newPage()

    if (fs.existsSync('cookies')) {
      logger.info('检测到有本地 cookies，读取中……')
      const savedCookies = await fs.readFile('cookies', 'utf8')
      if (savedCookies) {
        const cookies = JSON.parse(savedCookies)

        await context.addCookies(cookies)
      }
    }
    const page = await context.newPage()

    // 打开浏览器的第一个默认页面

    // 打开 中控台
    await page.goto(LIVE_CONTROL_URL)

    logger.info('准备登录中……')
    // 等待登录
    await page.waitForSelector(IS_LOGGED_IN_SELECTOR, { timeout: 0 })

    logger.success('登录成功')
    const cookies = await context.cookies()

    fs.writeFile('cookies', JSON.stringify(cookies)).catch((err) => {
      logger.error(`写入 cookies 失败: ${err}`)
    })
    // 等待中控台页面加载完成
    await page.waitForSelector(GOODS_ITEM_SELECTOR, { timeout: 0 })

    const popUpManager = createAutoPopUp(page, config?.autoPopUp ?? {
      goodsIds: [1, 2],
      random: true,
    })
    const autoMessage = createAutoMessage(page, config?.autoMessage ?? {
      messages: MESSAGES,
      pinTops: [1],
      random: true,
    })

    const taskManager = createTaskManager({
      tasks: [popUpManager, autoMessage],
    })

    taskManager.startAllTasks()
    checkLivingStatus()

    function checkLivingStatus() {
      let timer: NodeJS.Timeout | null = null
      timer = setInterval(async () => {
        if (!(await page.$(LIVE_TAG_SELECTOR))) {
          // 直播结束
          taskManager.stopAllTasks()
          logger.warn('直播未开始！！！')
          timer && clearInterval(timer)
          // browser.close()
        }
      }, 1000)
    }
  }) ()
}

export default start
