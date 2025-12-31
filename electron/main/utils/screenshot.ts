import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import type { Page } from 'playwright'

async function cleanupScreenshotDir() {
  const screenshotDirPath = path.join(app.getPath('logs'), 'screenshot')
  const files = await fs.readdir(screenshotDirPath)
  // files 按照文件名排序（截图的文件名开头是日期）
  if (files.length >= 20) {
    // 直接暴力删除最早的 10 张图，留 10 张图的余量缓冲
    for (const file of files.slice(0, 10)) {
      const filePath = path.join(screenshotDirPath, file)
      await fs.rm(filePath)
    }
  }
}

function getDateString(date: Date) {
  // 2025-03-21T12-00-00
  const $ = (num: number) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${$(date.getMonth() + 1)}-${$(date.getDate())}T${$(date.getHours())}-${$(date.getMinutes())}-${$(date.getSeconds())}`
}

export async function takeScreenshot(page: Page, taskName: string, accountName?: string) {
  const screenshotPath = path.join(
    app.getPath('logs'),
    'screenshot',
    `${getDateString(new Date())}-${taskName}${accountName ? `-${accountName}` : ''}.png`,
  )
  await cleanupScreenshotDir()
  await page.screenshot({ path: screenshotPath })
}
