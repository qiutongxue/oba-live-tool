import type { PopUpConfig } from './tasks/autoPopUp'
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
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain, shell } from 'electron'

import fs from 'fs-extra'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { connectLiveControl } from './liveControl'
import { createLogger } from './logger'
import { pageManager } from './taskManager'
import { createAutoMessage } from './tasks/autoMessage'
import { createAutoPopUp } from './tasks/autoPopUp'
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
    title: 'OBA 直播工具',
    width: 1280,
    height: 800,
    autoHideMenuBar: !app.isPackaged,
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

app.on('window-all-closed', async () => {
  win = null
  pageManager.cleanup()
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

// 添加配置验证函数
function validateConfig(config: any) {
  // 根据需要添加验证逻辑
  if (!config)
    throw new Error('配置不能为空')
  return true
}

// 添加配置路径常量
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

const logger = createLogger('main')

// 保存配置
ipcMain.handle(IPC_CHANNELS.config.save, async (_, config) => {
  try {
    validateConfig(config)
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
    return true
  }
  catch (error) {
    logger.error('保存配置失败:', error)
    throw error
  }
})

// 加载配置
ipcMain.handle(IPC_CHANNELS.config.load, async () => {
  try {
    if (await fs.pathExists(CONFIG_PATH)) {
      const configStr = await fs.readFile(CONFIG_PATH, 'utf-8')
      return JSON.parse(configStr)
    }
    return null
  }
  catch (error) {
    logger.error('加载配置失败:', error)
    throw error
  }
})

// 添加新的 IPC 处理函数
ipcMain.handle(IPC_CHANNELS.tasks.liveControl.connect, async () => {
  try {
    const { browser, page } = await connectLiveControl()
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

ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.start, async (_, config) => {
  pageManager.register('autoMessage', createAutoMessage, config)
  try {
    pageManager.startTask('autoMessage')
    return { success: true }
  }
  catch (error) {
    logger.error('启动自动发言失败:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.tasks.autoPopUp.start, async (_, config: Partial<PopUpConfig>) => {
  pageManager.register('autoPopUp', createAutoPopUp, config)
  try {
    pageManager.startTask('autoPopUp')
    return { success: true }
  }
  catch (error) {
    logger.error('启动自动弹窗失败:', error)
    throw error
  }
})

ipcMain.handle(IPC_CHANNELS.tasks.autoMessage.stop, async () => {
  pageManager.stopTask('autoMessage')
})

ipcMain.handle(IPC_CHANNELS.tasks.autoPopUp.stop, async () => {
  pageManager.stopTask('autoPopUp')
})
