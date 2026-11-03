import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, globalShortcut, screen } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 悬浮窗的全局快捷键 */
export const FLOAT_SHORTCUT = 'Control+Shift+B'

/** 当前打开方式：快捷键唤出 / 检测到售罄自动弹出 */
let currentMode: SeckillFloatMode = 'shortcut'
let floatWin: BrowserWindow | null = null

function rendererIndexHtml() {
  return path.join(process.env.APP_ROOT ?? path.join(__dirname, '../..'), 'dist', 'index.html')
}

function createFloatWindow(): BrowserWindow {
  if (floatWin && !floatWin.isDestroyed()) return floatWin

  const win = new BrowserWindow({
    width: 340,
    height: 460,
    minWidth: 300,
    minHeight: 240,
    frame: false,
    // 悬浮窗要能被拖动、可调高度（商品多的时候）
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#121317',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
    },
  })

  // screen-saver 层级：能盖在全屏直播软件之上
  win.setAlwaysOnTop(true, 'screen-saver')

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    void win.loadURL(`${devUrl}#/seckill-float`)
  } else {
    void win.loadFile(rendererIndexHtml(), { hash: '/seckill-float' })
  }

  win.once('ready-to-show', () => {
    // 靠右下角弹出，避开直播画面中心
    const area = screen.getPrimaryDisplay().workArea
    const [w] = win.getSize()
    win.setPosition(area.x + area.width - w - 24, area.y + 80)
    win.show()
  })
  win.on('closed', () => {
    floatWin = null
  })

  floatWin = win
  return win
}

/** 显示（不存在就创建） */
export function showFloatWindow() {
  const win = createFloatWindow()
  if (!win.isVisible()) win.show()
  win.focus()
}

/** 隐藏但不销毁，下次唤起更快 */
export function hideFloatWindow() {
  if (floatWin && !floatWin.isDestroyed()) floatWin.hide()
}

export function toggleFloatWindow() {
  if (floatWin && !floatWin.isDestroyed() && floatWin.isVisible()) hideFloatWindow()
  else showFloatWindow()
}

/**
 * 设置打开方式：
 * - `shortcut`：只注册全局快捷键，按了才弹
 * - `auto`：检测到售罄时自动弹出（快捷键仍然保留，方便手动查看）
 */
export function setFloatMode(mode: SeckillFloatMode) {
  currentMode = mode
  globalShortcut.unregister(FLOAT_SHORTCUT)
  const registered = globalShortcut.register(FLOAT_SHORTCUT, toggleFloatWindow)
  if (!registered) {
    // 快捷键被别的软件占用时不阻塞流程，只是按不出来
    console.warn(`[seckill] 快捷键 ${FLOAT_SHORTCUT} 注册失败（可能被占用）`)
  }
}

export function getFloatMode(): SeckillFloatMode {
  return currentMode
}

/** 售罄时调用：自动模式下弹出悬浮窗，快捷键模式下静默（不打断直播） */
export function notifySoldOut() {
  if (currentMode === 'auto') showFloatWindow()
}

export function disposeFloatWindow() {
  globalShortcut.unregister(FLOAT_SHORTCUT)
  if (floatWin && !floatWin.isDestroyed()) floatWin.destroy()
  floatWin = null
}
