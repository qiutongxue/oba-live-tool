import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
import process, { config } from 'node:process'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import fs from 'fs-extra'

import start from './start'
import { update } from './update'
import windowManager from './windowManager'

const _require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

app.commandLine.appendSwitch('remote-debugging-port', '9222')

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1'))
  app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32')
  app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  windowManager.registerWindow('main', win)

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  }
  else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:'))
      shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  update(win)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin')
    app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized())
      win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  }
  else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  }
  else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// 配置文件路径
const CONFIG_PATH = path.join(app.getPath('userData'), 'task-config.json')

// 验证配置
function validateConfig(config: any) {
  // 验证消息长度
  if (config.autoMessage.enabled) {
    const invalidMessages = config.autoMessage.messages.filter((msg: string) => msg.length > 50)
    if (invalidMessages.length > 0)
      throw new Error('消息长度不能超过50个字符！')
  }

  // 验证商品ID是否重复
  if (config.autoPopUp.enabled) {
    const uniqueGoodsIds = new Set(config.autoPopUp.goodsIds)
    if (uniqueGoodsIds.size !== config.autoPopUp.goodsIds.length)
      throw new Error('商品ID不能重复！')
  }
}

// 保存配置
ipcMain.handle('save-task-config', async (_, config) => {
  try {
    validateConfig(config)
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
    return true
  }
  catch (error) {
    console.error('保存配置失败:', error)
    throw error
  }
})

// 加载配置
ipcMain.handle('load-task-config', async () => {
  try {
    if (await fs.pathExists(CONFIG_PATH)) {
      const configStr = await fs.readFile(CONFIG_PATH, 'utf-8')
      return JSON.parse(configStr)
    }
    return null
  }
  catch (error) {
    console.error('加载配置失败:', error)
    throw error
  }
})

// 启动任务时使用保存的配置
ipcMain.handle('start', async (_, config) => {
  try {
    validateConfig(config)
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))

    const { autoMessage, autoPopUp } = config

    // 创建新窗口并启动任务
    start({
      autoMessage: autoMessage.enabled
        ? {
            messages: autoMessage.messages,
            interval: autoMessage.interval,
            pinTops: autoMessage.pinTops,
            random: autoMessage.random,
          }
        : undefined,
      autoPopUp: autoPopUp.enabled
        ? {
            goodsIds: autoPopUp.goodsIds,
            interval: autoPopUp.interval,
            random: autoPopUp.random,
          }
        : undefined,
    })
  }
  catch (error) {
    console.error('启动任务失败:', error)
    throw error
  }
})
