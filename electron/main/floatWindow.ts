import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, globalShortcut, screen } from 'electron'
import { IPC_CHANNELS } from 'shared/ipcChannels'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 悬浮窗的全局快捷键 */
export const FLOAT_SHORTCUT = 'Control+Shift+B'

/** 当前打开方式：快捷键唤出 / 检测到售罄自动弹出 */
let currentMode: SeckillFloatMode = 'shortcut'
let floatWin: BrowserWindow | null = null
/** 这次窗口是不是「检测到售罄」自动弹出的（自动弹出的才在补完后自动关） */
let openedByAuto = false
/** 窗口是否已经完成首次渲染（没渲染完就 show 会闪白屏） */
let floatReady = false
/** 自动弹出的时间点：刚弹出就收到「待补 0」时不急着关，先等页面把货架读出来 */
let autoShownAt = 0
/** 本轮自动弹出的窗口是否真的看到过待补商品（没见过就说明货架还没读出来，不能据此关窗） */
let sawPending = false
/** 上次自动弹出时的「售罄商品签名」，同一批售罄不重复弹，避免每轮巡检抢一次焦点 */
let lastSoldOutKey = ''
/** 自动弹出的窗口迟迟读不出待补商品时的兜底关窗定时器 */
let emptyWatchdog: ReturnType<typeof setTimeout> | null = null
/** 页面最近一次上报时，货架读取是否成功（null = 还没报过） */
let lastReportOk: boolean | null = null

const FLOAT_WIDTH = 280
const FLOAT_MIN_WIDTH = 240
const FLOAT_MIN_HEIGHT = 88
const FLOAT_DEFAULT_HEIGHT = 240
/** 自动弹出的窗口至少停留这么久才允许自己关掉（够页面把待补数量报上来） */
const AUTO_CLOSE_GRACE_MS = 800
/** 自动弹出的窗口超过这么久还没报告过待补商品，直接收起，不留空窗 */
const AUTO_EMPTY_TIMEOUT_MS = 20 * 1000

function clearEmptyWatchdog() {
  if (emptyWatchdog) clearTimeout(emptyWatchdog)
  emptyWatchdog = null
}

/**
 * 自动弹出的窗口若一直没读到待补商品，20 秒后自己收起。
 * 但货架读取一直失败时不能收：那种情况窗口里显示的是「读取失败，重试中」，收掉等于把错误藏了。
 */
function armEmptyWatchdog() {
  clearEmptyWatchdog()
  emptyWatchdog = setTimeout(() => {
    emptyWatchdog = null
    if (!openedByAuto || sawPending) return
    if (lastReportOk === false) return
    hideFloatWindow()
  }, AUTO_EMPTY_TIMEOUT_MS)
}

function rendererIndexHtml() {
  return path.join(process.env.APP_ROOT ?? path.join(__dirname, '../..'), 'dist', 'index.html')
}

function createFloatWindow(): BrowserWindow {
  if (floatWin && !floatWin.isDestroyed()) return floatWin

  const win = new BrowserWindow({
    width: FLOAT_WIDTH,
    height: FLOAT_DEFAULT_HEIGHT,
    minWidth: FLOAT_MIN_WIDTH,
    minHeight: FLOAT_MIN_HEIGHT,
    frame: false,
    // 悬浮窗要能被拖动、可调大小（商品多的时候）
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

  // ready-to-show 只在首帧渲染完成时触发；万一渲染异常迟迟不来，
  // 加载完成后兜底显示一次，避免出现「程序认为窗口已弹出、屏幕上什么都没有」
  const showOnce = () => {
    if (floatReady || win.isDestroyed()) return
    floatReady = true
    placeFloatWindow(win)
    win.show()
  }
  win.once('ready-to-show', showOnce)
  win.webContents.once('did-finish-load', () => {
    setTimeout(() => showOnce(), 400)
  })
  win.on('closed', () => {
    floatWin = null
    floatReady = false
    openedByAuto = false
    sawPending = false
    lastSoldOutKey = ''
  })

  floatWin = win
  return win
}

/** 默认弹出位置：屏幕左上角往内留一点，避免贴边抠不到也避免压住标题栏按钮 */
const FLOAT_MARGIN = 20

/** 首次弹出时定位到左上角，并保证整个窗口落在可用区域里（任务栏/异形屏都不会被切掉） */
function placeFloatWindow(win: BrowserWindow) {
  const area = screen.getPrimaryDisplay().workArea
  const [w, h] = win.getSize()
  const x = Math.min(area.x + FLOAT_MARGIN, Math.max(area.x, area.x + area.width - w))
  const y = Math.min(area.y + FLOAT_MARGIN, Math.max(area.y, area.y + area.height - h))
  win.setPosition(x, y)
}

/**
 * 只有窗口被拖到屏幕外（换过显示器/改过分辨率）才拉回默认位置；
 * 其余情况保留用户自己拖到的位置，不再每次弹出都强行归位。
 */
function ensureVisiblePosition(win: BrowserWindow) {
  const { x, y } = win.getBounds()
  const stillOnScreen = screen.getAllDisplays().some(d => {
    const area = d.workArea
    return (
      x + 60 > area.x &&
      x < area.x + area.width - 60 &&
      y + 24 > area.y &&
      y < area.y + area.height - 24
    )
  })
  if (!stillOnScreen) placeFloatWindow(win)
}

/** 页面还没加载完时发的消息会丢，等首帧渲染完再发 */
function sendShownEvent(win: BrowserWindow, goods: SeckillGoods[]) {
  const send = () => {
    if (win.isDestroyed()) return
    win.webContents.send(IPC_CHANNELS.seckill.floatShownEvent, { goods })
  }
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
  else send()
}

/**
 * 显示（不存在就创建）。
 *
 * `goods` 是触发这次弹出的货架快照：直接推给页面，
 * 免得页面自己再读一遍时读到不一样的结果，导致「弹出来又立刻被判成没有待补」。
 */
export function showFloatWindow(byAuto = false, goods: SeckillGoods[] = []) {
  const win = createFloatWindow()
  openedByAuto = byAuto
  if (byAuto) {
    autoShownAt = Date.now()
    sawPending = false
    lastReportOk = null
    armEmptyWatchdog()
  }
  if (!floatReady) {
    // ready-to-show 里会显示，这里只把事件补上
    sendShownEvent(win, goods)
    return
  }
  if (!win.isVisible()) win.show()
  ensureVisiblePosition(win)
  win.focus()
  sendShownEvent(win, goods)
}

/** 巡检拿到新的货架数据时，同步给已经打开的浮窗（页面不再自己读，避免两边数据打架） */
export function updateFloatGoods(goods: SeckillGoods[]) {
  if (!floatWin || floatWin.isDestroyed() || !floatReady || !floatWin.isVisible()) return
  floatWin.webContents.send(IPC_CHANNELS.seckill.floatGoodsEvent, { goods })
}

/** 浮窗当前是否显示中 */
export function isFloatWindowVisible(): boolean {
  return !!floatWin && !floatWin.isDestroyed() && floatWin.isVisible()
}

/** 由页面内容撑高：内容多高窗口就多高，超过屏幕可用高度才滚动 */
export function resizeFloatWindow(height: number, screenLimit?: number) {
  if (!floatWin || floatWin.isDestroyed() || !floatReady) return
  const maxHeight = screenLimit ?? screen.getPrimaryDisplay().workAreaSize.height - 100
  const target = Math.max(FLOAT_MIN_HEIGHT, Math.min(Math.round(height), maxHeight))
  const [width, currentHeight] = floatWin.getSize()
  if (Math.abs(target - currentHeight) < 4) return
  floatWin.setSize(Math.max(FLOAT_MIN_WIDTH, width || FLOAT_WIDTH), target, false)
}

/**
 * 页面报告剩余待补数量。
 *
 * 只有「自动弹出」的窗口才自己关，且必须满足：
 * - 这次弹出确实看到过待补商品（否则说明货架还没读出来，0 不可信）；
 * - 本次报告来自一次**成功**的货架读取（读取失败时页面保留旧数据，不能当成补完了）；
 * - 弹出已超过 0.8 秒（避开首帧的 0）。
 *
 * 关窗时清掉售罄签名：万一补完又立刻被秒空，下一轮巡检还能再弹出来。
 * 返回 true 表示确实关掉了窗口（供调用方记日志）。
 */
export function onFloatPendingCount(count: number, ok = true): boolean {
  lastReportOk = ok
  if (count > 0) {
    sawPending = true
    clearEmptyWatchdog()
    return false
  }
  if (!ok) return false
  if (!openedByAuto || !sawPending) return false
  if (Date.now() - autoShownAt < AUTO_CLOSE_GRACE_MS) return false
  sawPending = false
  lastSoldOutKey = ''
  hideFloatWindow()
  return true
}

/** 隐藏但不销毁，下次唤起更快 */
export function hideFloatWindow() {
  if (floatWin && !floatWin.isDestroyed()) floatWin.hide()
  openedByAuto = false
  sawPending = false
  clearEmptyWatchdog()
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

/**
 * 售罄时调用：自动模式下弹出悬浮窗，快捷键模式下静默（不打断直播）。
 *
 * `key` 是本轮售罄商品的签名：同一批商品一直售罄时不再重复弹窗、也不再抢焦点；
 * 出现新的售罄商品（签名变化）才重新弹。用户手动关掉窗口后同样不会被反复唤起。
 * `goods` 是这次巡检读到的货架，直接推给窗口，保证窗口内容和触发条件完全一致。
 */
export function notifySoldOut(key: string, goods: SeckillGoods[] = []) {
  if (currentMode !== 'auto') return
  if (key === lastSoldOutKey && floatWin && !floatWin.isDestroyed()) return
  lastSoldOutKey = key
  showFloatWindow(true, goods)
}

/** 货架上已经没有售罄商品：清空签名，下次售罄能正常弹窗 */
export function resetSoldOutState() {
  lastSoldOutKey = ''
}

export function disposeFloatWindow() {
  clearEmptyWatchdog()
  globalShortcut.unregister(FLOAT_SHORTCUT)
  if (floatWin && !floatWin.isDestroyed()) floatWin.destroy()
  floatWin = null
  floatReady = false
}
