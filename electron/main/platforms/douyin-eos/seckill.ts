import type { Page } from 'playwright'

/**
 * 秒杀补货（抖音团购 eos 中控台）。
 *
 * 页面事实（2026-10-28 由截图确认）：
 * - 右侧「直播商品」是虚拟列表（`#live-card-list`），一行一个商品；
 * - 行内文本含「剩余库存 569件」「秒杀价: ¥179」；
 * - 售罄时顶部横幅提示「…秒杀库存已告罄，请考虑是否增加库存」，并提供「增加库存」；
 * - 补货走「投放秒杀」弹窗：设置「投放库存」后点「提交」。
 *
 * ⚠️ 选择器全部用「文本 + 结构探测」，不写死带哈希的类名（eos 每次发版都会变）。
 * 定位不到时会返回诊断信息，配合 `dumpSeckillDom()` 一次性把结构抓出来。
 */

const SEL = {
  LIST: '#live-card-list',
  ROW: '#live-card-list div[class^="render-item"]',
} as const

const TEXT = {
  INCREASE: '增加库存',
  MODAL_TITLE: '投放秒杀',
  STOCK_LABEL: '投放库存',
  SUBMIT: '提交',
} as const

/** 从一行文本里解析库存 / 价格 / 是否售罄 */
function parseRowText(text: string) {
  const flat = text.replace(/\s+/g, ' ').trim()

  // 秒杀商品会显示「仅剩N件」+ 倒计时；普通商品只有「已售/库存: 654/99万+」
  const remaining = flat.match(/仅剩\s*(\d+)\s*件/)
  const soldStock = flat.match(/已售\/库存[:：]\s*([\d.]+[万亿]?)\s*\/\s*([\d.]+[万亿]?)/)
  const priceMatch = flat.match(/秒杀价\s*[:：]?\s*¥?\s*([\d.,]+)/)
  const isSeckill = Boolean(priceMatch || remaining)

  // 售罄判定：明确文案 > 「仅剩 0 件」
  const soldOut =
    /已售罄|告罄|已抢光|已售完/.test(flat) || (remaining ? Number(remaining[1]) <= 0 : false)

  // 标题：行文本开头是「讲解中」+ 商品名（会重复两遍），取第一段到「杭州市」之前的商品名
  const cleaned = flat.replace(/^(讲解中|讲解)\s*/, '')
  const titleMatch = cleaned.match(/^(.{4,80}?)(?:\s*杭州市|\s*Inner\s|\s*仅剩|\s*秒杀价|\s*¥)/)
  const title = (titleMatch?.[1] ?? cleaned.slice(0, 60)).trim()

  return {
    title,
    /** 秒杀剩余件数；非秒杀商品为 null */
    stock: remaining ? Number(remaining[1]) : null,
    /** 已售 / 库存（文本形式），排查用 */
    soldStockText: soldStock ? `${soldStock[1]}/${soldStock[2]}` : null,
    price: priceMatch ? priceMatch[1] : null,
    isSeckill,
    soldOut,
  }
}

/** 读取「直播商品」列表（含秒杀商品的剩余库存与是否售罄） */
export async function readSeckillGoods(page: Page): Promise<SeckillGoods[]> {
  const hasRows = await page
    .waitForSelector(SEL.ROW, { timeout: 15000, state: 'attached' })
    .catch(() => null)
  if (!hasRows) return []

  const rows = page.locator(SEL.ROW)
  const count = await rows.count().catch(() => 0)
  const result: SeckillGoods[] = []

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i)
    const text = await row.innerText().catch(() => '')
    if (!text.trim()) continue
    const parsed = parseRowText(text)
    result.push({
      index: i + 1,
      title: parsed.title || `商品 #${i + 1}`,
      stock: parsed.stock,
      price: parsed.price,
      soldOut: parsed.soldOut,
      isSeckill: parsed.isSeckill,
      soldStockText: parsed.soldStockText,
      rawText: text.replace(/\s+/g, ' ').slice(0, 200),
    })
  }
  return result
}

/**
 * 在页面里找「投放库存」输入框：从标签文本往上逐层找最近的 input。
 * 返回 null 表示没找到（弹窗结构变了）。
 */
const FIND_STOCK_INPUT = `(() => {
  // 标签旁边通常有个「?」图标，所以不能要求「纯文本节点且完全等于」，
  // 改成：文本以「投放库存」开头、长度很短的元素（取最内层）。
  const labels = Array.from(document.querySelectorAll('*')).filter((el) => {
    const t = (el.textContent || '').trim();
    return t.startsWith(${JSON.stringify(TEXT.STOCK_LABEL)}) && t.length <= 14;
  });
  for (let i = labels.length - 1; i >= 0; i--) {
    let scope = labels[i].parentElement;
    for (let depth = 0; depth < 5 && scope && scope !== document.body; depth++) {
      const input = scope.querySelector('input');
      if (input) {
        const rect = input.getBoundingClientRect();
        return { found: true, value: input.value, visible: rect.height > 0 };
      }
      scope = scope.parentElement;
    }
  }
  return { found: false, reason: 'no-input' };
})()`

/** 把值写进 React 受控输入框（必须用原生 setter + input 事件，否则页面状态不更新） */
const SET_STOCK_INPUT = (next: number) => `(() => {
  const labels = Array.from(document.querySelectorAll('*')).filter((el) => {
    const t = (el.textContent || '').trim();
    return t.startsWith(${JSON.stringify(TEXT.STOCK_LABEL)}) && t.length <= 14;
  });
  for (let i = labels.length - 1; i >= 0; i--) {
    let scope = labels[i].parentElement;
    for (let depth = 0; depth < 5 && scope && scope !== document.body; depth++) {
      const input = scope.querySelector('input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, String(${next}));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, value: input.value };
      }
      scope = scope.parentElement;
    }
  }
  return { ok: false, reason: 'no-input' };
})()`

type IconProbe = { index: number; cls: string; tip: string }

/**
 * 读取当前可见的 tooltip 气泡文字。
 *
 * ⚠️ 不能用 `[class*="tooltip"]`：eos 把 `okee-current-live-tooltip` 加在**触发器**上，
 * 它的 textContent 是按钮自身的文字（会读到一大段页面文本）。气泡是 `*-tooltip-inner`。
 */
async function readTooltipText(page: Page): Promise<string> {
  return (await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll('[class*="tooltip-inner"], [role="tooltip"]'),
    ) as HTMLElement[]
    const visible = nodes.filter(el => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      return (
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        (el.textContent || '').trim().length > 0
      )
    })
    const last = visible.at(-1)
    return (last?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)
  })) as string
}

/**
 * 逐个 hover 行内图标，记录各自的 tooltip 文案。
 *
 * eos 的图标没有文字、也没有 aria-label，只能靠 hover 弹的 tooltip 认。
 */
async function probeRowIcons(page: Page, row: import('playwright').Locator): Promise<IconProbe[]> {
  const icons = row.locator('span:has(svg), button:has(svg)')
  const count = Math.min(await icons.count().catch(() => 0), 12)
  const probes: IconProbe[] = []

  for (let i = 0; i < count; i++) {
    const icon = icons.nth(i)
    if (!(await icon.isVisible().catch(() => false))) continue
    const cls = ((await icon.getAttribute('class').catch(() => '')) ?? '').slice(0, 70)
    await icon.hover({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(450)
    const tip = await readTooltipText(page).catch(() => '')
    probes.push({ index: i, cls, tip })
  }
  return probes
}

/** 等「投放库存」输入框出现（比等弹窗标题可靠：标题文案可能变，输入框必须存在才能继续） */
async function waitStockInput(page: Page, timeout: number): Promise<boolean> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const found = (await page.evaluate(FIND_STOCK_INPUT).catch(() => ({ found: false }))) as {
      found: boolean
    }
    if (found.found) return true
    await page.waitForTimeout(400)
  }
  return false
}

/** 记住「能打开秒杀详情」的图标序号：成功过一次就不再逐个 hover 轮询 */
let cachedSeckillIconIndex: number | null = null

/** 等「秒杀详情」抽屉出现（有标题或「编辑/停止投放」按钮都算） */
async function waitSeckillDetail(page: Page, timeout: number): Promise<boolean> {
  return await page
    .waitForSelector(':text-is("秒杀详情"), button:text-is("编辑"), button:text-is("停止投放")', {
      timeout,
      state: 'visible',
    })
    .then(() => true)
    .catch(() => false)
}

/**
 * 点开「投放库存」表单。
 *
 * 实际路径（2026-10-28 用户截图确认）：
 *   行内「秒杀」图标 → **秒杀详情**（只读，有「编辑」「停止投放」）→ 点「编辑」→ 才有「投放库存」输入框
 * 所以判定用「输入框是否出现」，中间那步「编辑」不能少。
 */
/** 派发点击：先直接派发事件（绕过遮罩/tooltip 的命中检测），不行再真点 */
async function actClick(target: import('playwright').Locator): Promise<boolean> {
  // 按真实点击的事件顺序派发：有的组件监听 mousedown/pointerdown 而不是 click
  const sequence = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']
  let dispatched = false
  for (const type of sequence) {
    const ok = await target
      .dispatchEvent(type)
      .then(() => true)
      .catch(() => false)
    dispatched = dispatched || ok
  }
  if (dispatched) return true
  return await target
    .click({ timeout: 3000 })
    .then(() => true)
    .catch(() => false)
}

/** 当前可见的菜单项文本（点击图标有时先弹一个小菜单） */
async function visibleMenuTexts(page: Page): Promise<string> {
  return (await page.evaluate(() => {
    // ⚠️ 只认真正的弹出菜单：`[class*="menu-item"]` 会命中左侧主导航（okee-main-menu-item）
    const nodes = Array.from(
      document.querySelectorAll(
        '[role="menuitem"], [class*="dropdown"] li, [class*="popover"] [class*="item"]',
      ),
    ) as HTMLElement[]
    return nodes
      .filter(el => el.getBoundingClientRect().height > 0)
      .map(el => (el.textContent || '').replace(/\s+/g, '').slice(0, 10))
      .slice(0, 8)
      .join('/')
  })) as string
}

async function clickAndOpen(
  page: Page,
  row: import('playwright').Locator,
  index: number,
  trace: string[],
): Promise<boolean> {
  const icons = row.locator('span:has(svg), button:has(svg)')
  const icon = icons.nth(index)
  if (!(await icon.isVisible().catch(() => false))) {
    trace.push(`#${index} 不可见`)
    return false
  }

  // 依次尝试：图标本身 → 父 → 祖父（点击处理器可能挂在更外层）
  const layers: Array<[string, import('playwright').Locator]> = [
    ['图标', icon],
    ['父', icon.locator('xpath=..')],
    ['祖父', icon.locator('xpath=../..')],
  ]

  for (const [label, target] of layers) {
    const acted = await actClick(target)
    if (!acted) {
      trace.push(`#${index} 点${label}失败`)
      continue
    }

    // 少数版本点开就是投放表单
    if (await waitStockInput(page, 1500)) {
      trace.push(`#${index} 点${label}→直接出投放库存`)
      return true
    }

    // 正常版本：先出「秒杀详情」，再点「编辑」
    if (await waitSeckillDetail(page, 4000)) {
      trace.push(`#${index} 点${label}→秒杀详情=有`)
      const editBtn = page.locator('button:text-is("编辑"), :text-is("编辑")').last()
      if (await editBtn.isVisible().catch(() => false)) {
        await actClick(editBtn)
        if (await waitStockInput(page, 8000)) {
          trace.push('点编辑→投放库存=有')
          return true
        }
        const labels = (await page
          .evaluate(() =>
            Array.from(document.querySelectorAll('*'))
              .filter(
                el => el.childElementCount === 0 && /库存|数量|件数/.test(el.textContent || ''),
              )
              .slice(0, 8)
              .map(el => (el.textContent || '').replace(/\s+/g, '').slice(0, 12)),
          )
          .catch(() => [])) as string[]
        trace.push(
          `点编辑→投放库存=无（库存类标签：${Array.from(new Set(labels)).join('/') || '无'}）`,
        )
      } else {
        trace.push('找不到「编辑」')
      }
      continue
    }

    // 可能是先弹一个小菜单
    const menuTexts = await visibleMenuTexts(page).catch(() => '')
    trace.push(`#${index} 点${label}→详情=无${menuTexts ? `，菜单：${menuTexts}` : ''}`)
    if (menuTexts) {
      const item = page
        .locator('[role="menuitem"], [class*="menu-item"], [class*="dropdown"] li')
        .filter({ hasText: /秒杀|投放/ })
        .first()
      if ((await item.count().catch(() => 0)) > 0) {
        await actClick(item)
        if (await waitStockInput(page, 5000)) {
          trace.push('点菜单项→投放库存=有')
          return true
        }
        trace.push('点菜单项→无输入框')
      }
    }
  }
  return false
}

/** 逐个 target（主文档 + 所有 iframe）尝试寻找，返回命中的那个 */
function allTargets(page: Page): Array<import('playwright').Page | import('playwright').Frame> {
  return [page, ...page.frames()]
}

/** 在页面和所有 iframe 里找「投放库存」输入框 */
async function locateStockInput(page: Page): Promise<{
  target: import('playwright').Page | import('playwright').Frame
  value: string
} | null> {
  for (const target of allTargets(page)) {
    const found = (await target.evaluate(FIND_STOCK_INPUT).catch(() => ({ found: false }))) as
      | { found: true; value: string; visible: boolean }
      | { found: false }
    if (found.found && found.visible) return { target, value: found.value }
  }
  return null
}

/** 轮询等「投放库存」出现（跨所有 frame） */
async function waitForStockInput(
  page: Page,
  timeout: number,
): Promise<{
  target: import('playwright').Page | import('playwright').Frame
  value: string
} | null> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const readStarted = Date.now()
    const located = await locateStockInput(page)
    if (located) return located
    await page.waitForTimeout(400)
  }
  return null
}

/** 在页面和所有 iframe 里点「编辑」 */
async function clickEditInAnyFrame(page: Page): Promise<boolean> {
  for (const target of allTargets(page)) {
    const btn = target.locator('button:text-is("编辑"), :text-is("编辑")').last()
    if (await btn.isVisible().catch(() => false)) {
      const ok = await actClick(btn)
      if (ok) return true
    }
  }
  return false
}

/** 描述当前抽屉内部/** 描述当前抽屉内部：文字、按钮、是否 iframe（排查「抽屉开了但找不到编辑」） */
async function describeDrawer(page: Page): Promise<string> {
  return (await page
    .evaluate(() => {
      const dialogs = Array.from(
        document.querySelectorAll('[class*="drawer-dialog"], [class*="modal"]'),
      ) as HTMLElement[]
      const visible = dialogs.filter(el => el.getBoundingClientRect().height > 0)
      const d = visible.at(-1)
      const buttons = Array.from(d?.querySelectorAll('button, [role="button"], span') ?? [])
        .map(b => (b.textContent || '').replace(/\s+/g, '').trim())
        .filter(t => t.length > 0 && t.length <= 10)
        .slice(0, 15)
      return JSON.stringify({
        dialogs: dialogs.length,
        text: (d?.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
        buttons: Array.from(new Set(buttons)),
        iframes: Array.from(document.querySelectorAll('iframe')).map(
          f => (f as HTMLIFrameElement).src || '(no src)',
        ),
      })
    })
    .catch(() => '{}')) as string
}

/**
 * 点行内「闹钟」按钮（秒杀入口），并一路走到「投放库存」表单。
 *
 * 2026-11-01 由真实点击录制确认：
 *   svg → DIV.seckill-btn-container-xxxx(28×28) → span → span → DIV.operate-area → ...
 * 类名后缀是哈希会变，但 `seckill-btn-container` 前缀稳定，直接用它定位，
 * 不再靠「讲解按钮的兄弟元素」猜。
 * 点击后会打开 `okee-main-drawer-dialog` 抽屉（秒杀详情），里面再点「编辑」。
 */
async function openSeckillByButton(
  page: Page,
  row: import('playwright').Locator,
  trace: string[],
): Promise<boolean> {
  const button = row.locator('[class^="seckill-btn-container"]').first()
  const count = await button.count().catch(() => 0)
  if (count === 0) {
    trace.push('行内没有 seckill-btn-container')
    return false
  }

  const acted = await actClick(button)
  trace.push(`点闹钟按钮=${acted ? '成功' : '失败'}`)
  if (!acted) return false

  // 抽屉内容在 iframe 里，且点「编辑」后可能再换一层 —— 统一在「主文档 + 所有 frame」里找
  const deadline = Date.now() + 25000
  let editClicked = false

  while (Date.now() < deadline) {
    if (await waitForStockInput(page, 800)) {
      trace.push('已到投放库存表单')
      return true
    }

    if (!editClicked) {
      const clicked = await clickEditInAnyFrame(page)
      editClicked = clicked
      trace.push(clicked ? '已点编辑' : '暂未看到「编辑」')
    }
    await page.waitForTimeout(500)
  }

  const frameTexts: string[] = []
  for (const target of allTargets(page)) {
    const text = await target
      .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 120))
      .catch(() => '')
    if (text) frameTexts.push(`[${target.url().slice(0, 40)}] ${text}`)
  }
  const frameText = frameTexts.join(' || ').slice(0, 400)
  const drawer = await describeDrawer(page).catch(() => '{}')
  trace.push(
    `${editClicked ? '点了编辑但没等到投放库存' : '抽屉已打开但没找到「编辑」'}；抽屉内容=${drawer}`,
  )
  return false
}

/** 页面当前可见的短文本/** 页面当前可见的短文本/** 页面当前可见的短文本（排查用，控制在 25 条以内） */
async function snapshotTexts(page: Page): Promise<string> {
  return (await page.evaluate(() => {
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect()
      const st = getComputedStyle(el as HTMLElement)
      return r.height > 0 && st.display !== 'none' && st.visibility !== 'hidden'
    }
    const texts = Array.from(document.querySelectorAll('button, [role="button"], span, div'))
      .filter(el => el.childElementCount === 0 && visible(el))
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 0 && t.length <= 12)
    return Array.from(new Set(texts)).slice(0, 25).join(' / ')
  })) as string
}

/** 按 tooltip 找到秒杀图标并点开（只在没有缓存时用） */
async function openSeckillDialog(
  page: Page,
  row: import('playwright').Locator,
  probes: IconProbe[],
  trace: string[],
): Promise<boolean> {
  const candidates = probes.filter(p => /秒杀/.test(p.tip))
  trace.push(`命中候选图标：${candidates.map(c => `#${c.index}`).join(',') || '无'}`)
  for (const candidate of candidates) {
    if (await clickAndOpen(page, row, candidate.index, trace)) {
      cachedSeckillIconIndex = candidate.index
      return true
    }
  }
  return false
}

/**
 * 点「增加库存」文字入口（兜底：有些版本会有文字按钮）。
 */
async function clickIncreaseEntry(page: Page, row: import('playwright').Locator): Promise<boolean> {
  const attempts = [
    row.locator(`:text-is("${TEXT.INCREASE}")`),
    row.locator(`button:has-text("${TEXT.INCREASE}")`),
    page.locator(`button:has-text("${TEXT.INCREASE}")`),
    page.locator(`[role="button"]:has-text("${TEXT.INCREASE}")`),
    page.locator(`div:text-is("${TEXT.INCREASE}")`),
    page.locator(`:text-is("${TEXT.INCREASE}")`),
  ]

  for (const locator of attempts) {
    const count = await locator.count().catch(() => 0)
    for (let i = 0; i < count; i++) {
      const el = locator.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const ok = await el
        .click({ timeout: 5000 })
        .then(() => true)
        .catch(() => false)
      if (ok) return true
    }
  }
  return false
}

/**
 * 对第 index 个商品补货：打开「投放秒杀」弹窗 → 投放库存 = 当前值 + addCount → 提交。
 * index 与 `readSeckillGoods` 返回的序号一致（1-based）。
 */
export async function restockSeckill(
  page: Page,
  index: number,
  addCount: number,
  manualEntry = false,
): Promise<SeckillRestockResult> {
  const startedAt = Date.now()
  const timings = { openModalMs: 0, readStockMs: 0, submitMs: 0, verifyMs: 0 }

  const rows = page.locator(SEL.ROW)
  const count = await rows.count().catch(() => 0)
  if (count === 0) throw new Error('没有读到「直播商品」列表，请确认已连接中控台且在直播中')
  if (index < 1 || index > count) {
    throw new Error(`商品序号 ${index} 超出范围（当前共 ${count} 个）`)
  }

  const row = rows.nth(index - 1)
  const beforeText = await row.innerText().catch(() => '')
  const before = parseRowText(beforeText)

  // 1) 打开「投放秒杀」弹窗
  // ⚠️ 秒杀入口是行内的**闹钟图标**（无文字、无 aria-label），只能 hover 读 tooltip 来认。
  await row.hover({ timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(300)

  let probes: IconProbe[] = []
  const trace: string[] = []

  let opened = false

  if (manualEntry) {
    // 手动模式：完全不点页面，等用户自己打开「投放库存」表单
    trace.push('手动模式：等待你点开闹钟 → 编辑')
    opened = await waitStockInput(page, 180000)
    if (!opened) {
      throw new Error(
        '等待超时：180 秒内没检测到「投放库存」输入框。' +
          '请在页面上点商品右侧的闹钟图标 → 秒杀详情 → 编辑，打开后重新点补货',
      )
    }
    trace.push('检测到投放库存，开始填数')
  } else {
    // 自动模式：先用稳定的类名前缀点闹钟按钮，再退到其它方式
    opened = await openSeckillByButton(page, row, trace)
    if (!opened) {
      opened = await clickIncreaseEntry(page, row)
      if (opened) trace.push('命中「增加库存」入口')
    }
    if (!opened && cachedSeckillIconIndex !== null) {
      opened = await clickAndOpen(page, row, cachedSeckillIconIndex, trace)
      if (!opened) trace.push('缓存序号失效')
    }
    if (!opened) {
      probes = await probeRowIcons(page, row)
      opened = await openSeckillDialog(page, row, probes, trace)
    }
    if (!opened) {
      await row.click({ timeout: 8000 }).catch(() => {})
      await page.waitForTimeout(500)
      const probesAfterSelect = await probeRowIcons(page, row)
      opened =
        (await openSeckillDialog(page, row, probesAfterSelect, trace)) ||
        (await clickIncreaseEntry(page, row))
    }
  }

  if (!opened) {
    const iconsText = probes.map(p => `#${p.index} "${p.tip || '(无 tooltip)'}"`).join('，')
    const visibleTexts = await snapshotTexts(page).catch(() => '')
    throw new Error(
      `没点开秒杀表单。步骤：${trace.join(' → ') || '(无)'}；` +
        `该商品${before.soldOut ? '已售罄' : '未售罄'}；` +
        `图标 tooltip：${iconsText || '(没探测到图标)'}；` +
        `当前可见按钮：${visibleTexts || '(读不到)'}`,
    )
  }

  // 2) 弹窗已经由 openSeckillDialog 用「投放库存」输入框确认过，这里不再校验标题
  //    （标题文案在不同版本可能是「投放秒杀」或别的，卡标题会误判）
  timings.openModalMs = Date.now() - startedAt

  // 3) 读当前「投放库存」→ 加 N
  //    详情内容在 iframe 里，所有读写都要在 frame 上做
  const readStarted = Date.now()
  const located = await locateStockInput(page)
  if (!located) {
    throw new Error('「投放秒杀」里没找到「投放库存」输入框（主文档和所有 iframe 都查过了）')
  }
  const uiTarget = located.target
  const current = { found: true as const, value: located.value }
  const beforeValue = Number.parseInt(current.value, 10)
  if (!Number.isFinite(beforeValue)) {
    throw new Error(`「投放库存」当前值不是数字：${current.value}`)
  }
  const nextValue = beforeValue + addCount
  timings.readStockMs = Date.now() - readStarted

  const setResult = (await uiTarget.evaluate(SET_STOCK_INPUT(nextValue))) as
    | { ok: true; value: string }
    | { ok: false; reason: string }
  if (!setResult.ok) {
    throw new Error(`写入「投放库存」失败（${setResult.reason}）`)
  }

  // 4) 提交
  const submitStarted = Date.now()
  // 「提交」在不同版本可能叫「保存 / 确定」，按优先级找第一个可见可用的
  const submitCandidates = ['提交', '保存', '确定'].map(t => `button:text-is("${t}")`)
  let submitBtn: import('playwright').Locator | null = null
  for (const selector of submitCandidates) {
    const locator = uiTarget.locator(selector).last()
    if (await locator.isVisible().catch(() => false)) {
      submitBtn = locator
      break
    }
  }
  if (!submitBtn) throw new Error('找不到「提交/保存」按钮')
  if (await submitBtn.isDisabled().catch(() => false)) {
    throw new Error('「提交」按钮不可用：投放库存可能超出可售库存，或表单未填完')
  }
  await submitBtn.click()
  timings.submitMs = Date.now() - submitStarted

  // 5) 等弹窗关闭（提交成功的表现），并复核剩余库存是否真的变了
  //    同样不依赖标题：以「投放库存」输入框消失为准
  let sawSuccessText = false
  const closed = await (async () => {
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      const found = (await uiTarget.evaluate(FIND_STOCK_INPUT).catch(() => ({ found: true }))) as {
        found: boolean
        visible?: boolean
      }
      // 表单收起来后，输入框可能只是被隐藏（仍留在 DOM 里），所以判「不可见」也算关闭
      if (!found.found || found.visible === false) return true

      // 兜底：出现成功提示也算提交完成
      const successText = await uiTarget
        .evaluate(() =>
          /提交成功|保存成功|操作成功|已提交|审核中/.test(document.body?.innerText || ''),
        )
        .catch(() => false)
      if (successText) {
        sawSuccessText = true
        return true
      }

      await page.waitForTimeout(500)
    }
    return false
  })()

  const verifyStarted = Date.now()
  let after: number | null = null
  if (closed) {
    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      await page.waitForTimeout(800)
      const text = await row.innerText().catch(() => '')
      const parsed = parseRowText(text)
      if (parsed.stock !== null && parsed.stock !== before.stock) {
        after = parsed.stock
        break
      }
    }
  }
  timings.verifyMs = Date.now() - verifyStarted

  const verified = after !== null
  return {
    index,
    title: before.title,
    before: beforeValue,
    next: nextValue,
    beforeStock: before.stock,
    afterStock: after,
    verified,
    closed,
    message: verified
      ? `投放库存 ${beforeValue} → ${nextValue}，剩余库存已变为 ${after}（合计 ${Date.now() - startedAt}ms）`
      : closed
        ? `投放库存已提交（${beforeValue} → ${nextValue}）${
            sawSuccessText ? '，页面已提示成功' : ''
          }，列表可能还没刷新`
        : '已点提交，但 15 秒内表单没有收起，可能在提交中或失败，请到页面核对',
    timings,
  }
}

/**
 * 导出页面结构，用于定位失败时排查。
 * 只取关键片段（列表行 / 按钮文案 / 输入框），避免日志过大。
 */
export async function dumpSeckillDom(page: Page): Promise<string> {
  // ⚠️ 导出内容必须短：electron-log 会截断超长单条日志，
  // 早期版本把整段 row HTML 塞进去，结果日志里的 JSON 直接断掉没法用。
  const base = (await page.evaluate(() => {
    const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)
    const rows = Array.from(document.querySelectorAll('#live-card-list div[class^="render-item"]'))
    return {
      url: location.href,
      hasList: Boolean(document.querySelector('#live-card-list')),
      rowCount: rows.length,
      rowTexts: rows
        .slice(0, 3)
        .map(r => clip((r.textContent || '').replace(/\s+/g, ' ').trim(), 120)),
      stockTexts: Array.from(document.querySelectorAll('*'))
        .filter(
          el => el.childElementCount === 0 && /仅剩|库存|秒杀|售罄|告罄/.test(el.textContent || ''),
        )
        .slice(0, 20)
        .map(el => `${el.tagName}."${(el.textContent || '').trim().slice(0, 20)}"`),
      inputs: Array.from(document.querySelectorAll('input'))
        .slice(0, 8)
        .map(i => ({
          type: i.type,
          value: i.value,
          ph: i.placeholder,
          cls: i.className.slice(0, 40),
        })),
    }
  })) as Record<string, unknown>

  // 附上第一行每个图标的 tooltip（含「秒杀」字样的那个就是入口）
  const firstRow = page.locator(SEL.ROW).first()
  const probes = (await firstRow.count().catch(() => 0))
    ? await probeRowIcons(page, firstRow).catch(() => [])
    : []

  return JSON.stringify({ ...base, firstRowIcons: probes }, null, 2)
}

/**
 * 录制用户在页面上的一次真实点击，返回点击目标链。
 *
 * 用途：入口元素无法靠结构稳定定位时，让用户点一次，
 * 把「点了哪个元素、它的父链、以及点完之后出现了什么」都记下来，
 * 再据此写确定的选择器。只读，不点击、不持有页面锁。
 */
export async function recordSeckillClick(page: Page, timeoutMs = 90000): Promise<string> {
  // ⚠️ 这里必须传真正的函数，不能传字符串：传 '() => xxx' 会被当成「一个函数表达式」，
  // 结果是个恒为真的函数对象 —— 于是立刻就返回了，压根没等到用户点击。
  await page.evaluate(() => {
    const w = window as unknown as {
      __seckillClickLog: unknown
      __seckillOff?: () => void
    }
    w.__seckillClickLog = null

    const describe = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName,
        cls: String((el as HTMLElement).className || '').slice(0, 90),
        id: (el as HTMLElement).id || '',
        role: el.getAttribute('role') || '',
        aria: el.getAttribute('aria-label') || '',
        text: (el.textContent || '').replace(/\s+/g, '').slice(0, 24),
        rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      }
    }

    const handler = (e: MouseEvent) => {
      if (w.__seckillClickLog) return
      const chain: unknown[] = []
      let node: Element | null = e.target as Element
      for (let i = 0; i < 6 && node; i++) {
        chain.push(describe(node))
        node = node.parentElement
      }
      w.__seckillClickLog = { x: Math.round(e.clientX), y: Math.round(e.clientY), chain }
    }

    document.addEventListener('click', handler, true)
    w.__seckillOff = () => document.removeEventListener('click', handler, true)
  })

  let clicked: unknown = null
  let failure: string | null = null

  try {
    await page.waitForFunction(
      () => Boolean((window as unknown as { __seckillClickLog?: unknown }).__seckillClickLog),
      undefined,
      { timeout: timeoutMs },
    )
    clicked = await page.evaluate(
      () => (window as unknown as { __seckillClickLog?: unknown }).__seckillClickLog ?? null,
    )
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err)
  }

  // 点完之后页面出现了什么（判断入口是否点对）
  await page.waitForTimeout(2500)
  const after = await page
    .evaluate(() => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect()
        const st = getComputedStyle(el)
        return r.height > 0 && st.display !== 'none' && st.visibility !== 'hidden'
      }
      const overlays = Array.from(document.querySelectorAll('[class*="drawer"],[class*="modal"]'))
        .filter(visible)
        .map(el => String((el as HTMLElement).className).slice(0, 50))
        .slice(0, 5)
      return {
        detail: document.body.innerText.includes('秒杀详情'),
        stockInput: document.body.innerText.includes('投放库存'),
        editBtn: document.body.innerText.includes('编辑'),
        overlays,
      }
    })
    .catch(() => null)

  await page
    .evaluate(() => {
      const w = window as unknown as { __seckillOff?: () => void }
      w.__seckillOff?.()
    })
    .catch(() => {})

  return JSON.stringify({ clicked, after, failure }, null, 2)
}
