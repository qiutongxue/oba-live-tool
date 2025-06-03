import { sleep } from '#/utils'
import type { BrowserSession } from '../types'
import { BaseAdapter } from './BaseAdapter'

export class XiaohongshuAdapter extends BaseAdapter {
  async afterLogin(session: BrowserSession) {
    // 小红书反爬，直接访问无法正常加载元素，需要绕开
    // 1. 先回到首页
    await session.page.goto('https://ark.xiaohongshu.com/')
    // 2. 点击左侧 sidebar 的直播中控台
    // 等内容菜单出现（防止因为加载慢导致获取出错
    await session.page.waitForSelector('#root-menu-wrapper .menu-item')
    // 菜单子项中找到直播中控台
    // 因为不同账号的权限不同，菜单的内容也不同，所以就直接遍历所有子项
    const contentMenuItems = await session.page.$$(
      '#root-menu-wrapper .menu-item',
    )
    for (const item of contentMenuItems) {
      const text = await item.textContent()
      if (text === '直播中控台') {
        await item.click()
        await sleep(1000)
        break
      }
    }
    // 保留新页面作为当前页面
    for (const page of session.context.pages()) {
      if (page.url().includes('live_center_control')) {
        const prevPage = session.page
        session.page = page
        await prevPage.close()
        break
      }
    }
  }
}
