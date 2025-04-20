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
import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'

import fs from 'fs-extra'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { createLogger } from './logger'
import { pageManager } from './taskManager'
import { update } from './update'
import { findChromium } from './utils/checkChrome'
import windowManager from './windowManager'
import './tasks/liveControl'
import './tasks/autoMessage'
import './tasks/autoPopUp'
import './tasks/autoReply'
import './tasks/aiChat'
import './tasks/autoReplyPlus'
import { typedIpcMainHandle } from './utils'

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
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

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
    autoHideMenuBar: app.isPackaged,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,
      nodeIntegration: process.env.NODE_ENV === 'development',
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  windowManager.registerWindow('main', win)

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  update(win)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', async () => {
  win = null
  pageManager.cleanup()
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
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
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

typedIpcMainHandle(IPC_CHANNELS.chrome.getPath, async (_, edge) => {
  const path = await findChromium(edge)
  return path
})

typedIpcMainHandle(IPC_CHANNELS.chrome.selectPath, async () => {
  // 打开文件选择器，选择 chrome.exe/msedge.exe
  if (process.platform === 'darwin') {
    dialog.showErrorBox(
      '无法选择文件',
      '考虑到安全性，暂时不向 MacOS 平台提供浏览器路径的选择，请使用上方的自动检测浏览器功能',
    )
    // const result = await dialog.showOpenDialog({
    //   properties: ['openFile', 'treatPackageAsDirectory'],
    //   defaultPath: '/Applications',
    // })

    // if (result.canceled || result.filePaths.length === 0) {
    //   return null
    // }

    // const selectedPath = result.filePaths[0]
    // const pathParts = selectedPath.split(path.sep)

    // // 必须是可执行文件
    // const looksLikeMacExecutable =
    //   pathParts.includes('Contents') &&
    //   pathParts.includes('MacOS') &&
    //   fs.existsSync(selectedPath) &&
    //   !fs.lstatSync(selectedPath).isDirectory()

    // const executableName = path.basename(selectedPath)
    // const isValidName =
    //   executableName === 'Google Chrome' || executableName === 'Microsoft Edge'
    // if (looksLikeMacExecutable && isValidName) {
    //   return selectedPath
    // }
    // dialog.showErrorBox(
    //   '无效的选择',
    //   `选择的文件（${executableName}）似乎不是正确的可执行文件。\n\n请进入应用程序包（例如 Google Chrome.app）内部，找到 'Contents' -> 'MacOS' 文件夹，并选择名为 'Google Chrome' 或 'Microsoft Edge' 的文件。`,
    // )
  } else {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'treatPackageAsDirectory'],
      filters: [{ name: 'chrome|msedge', extensions: ['exe'] }],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]
    const fileName = selectedPath.toLowerCase().split('\\').pop()
    if (fileName === 'chrome.exe' || fileName === 'msedge.exe') {
      return selectedPath
    }
    dialog.showErrorBox(
      '无效的选择',
      `选择的文件（${fileName}）似乎不是正确的可执行文件。\n\n请选择名为 'chrome.exe' 或 'msedge.exe' 的文件。`,
    )
  }
  return null
})

typedIpcMainHandle(IPC_CHANNELS.chrome.toggleDevTools, event => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools()
    } else {
      win.webContents.openDevTools()
    }
  }
})

typedIpcMainHandle(IPC_CHANNELS.app.openLogFolder, () => {
  shell.openPath(app.getPath('logs'))
})
