import type { Page } from 'playwright'
import { takeScreenshot } from '#/utils'

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

/**
 * 从一段文本里解析数量。
 *
 * 页面上的数字可能带千分位、单位或货币符号（「1,000」「1 000 件」「¥10」），
 * 直接 parseInt 会得到 NaN 或错误值，所以统一先归一化再取第一个数字。
 */
function parseQuantity(raw: string | null | undefined): number | null {
  if (!raw) return null
  const normalized = raw.replace(/[，,\s]/g, '')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number.parseFloat(match[0])
  return Number.isFinite(value) ? Math.round(value) : null
}

/** 输入框为空时，退而在「投放库存」紧邻的文字里找数字，如「投放库存 10 件」 */
function parseStockFromScopeText(text: string | null | undefined): number | null {
  if (!text) return null
  // 只认紧跟在标签后面的数字，避免把「投放库存?（可售 99）」里的 99 当成当前投放量
  const match = text.replace(/\s+/g, '').match(/投放库存[:：]?(\d+)/)
  return match ? Number.parseInt(match[1], 10) : null
}

/** 从「投放库存 可售库存：0」这类文字里取可售库存 */
function parseAvailableFromScopeText(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.replace(/\s+/g, '').match(/可售库存[:：]?(\d+)/)
  return match ? Number.parseInt(match[1], 10) : null
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
/**
 * 找一个「数量输入框」，并带回足够的信息做兜底解析。
 *
 * ⚠️ 必须排除 radio / checkbox / hidden：同一个容器里常有「投放方式」的单选框，
 * 它们的 value 是 "on" —— 早期版本直接取第一个 input，于是拿到 "on" 判成「不是数字」。
 * 另外 value 可能为空（当前值显示在 placeholder 或旁边文案里），所以一起返回。
 */
const STOCK_INPUT_SELECTOR =
  'input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]):not([type="file"])'

/**
 * 找「投放库存」对应的那个输入框。
 *
 * 不能「找到第一个 input 就用」：标签的上层容器可能是整个表单，
 * 第一个 input 往往是「活动名称」这类空文本框，取到的 value 不是数字。
 * 这里按特征打分挑最像的：
 *   +3 与标签同一行   +2 值本身是数字   +2 占位符含 库存/数量/件
 *   +1 在标签右侧     +1 type=number
 * 选中后打上 data 标记，写入时按标记找同一个框。
 */
const FIND_STOCK_INPUT = `(() => {
  const SELECTOR = ${JSON.stringify(STOCK_INPUT_SELECTOR)};
  const labels = Array.from(document.querySelectorAll('*')).filter((el) => {
    const t = (el.textContent || '').trim();
    return t.startsWith(${JSON.stringify(TEXT.STOCK_LABEL)}) && t.length <= 14;
  });
  if (!labels.length) return { found: false, reason: 'no-label', candidates: [] };

  const label = labels[labels.length - 1];
  const lr = label.getBoundingClientRect();

  const seen = new Set();
  const candidates = [];
  let scope = label.parentElement;
  for (let depth = 0; depth < 6 && scope && scope !== document.body; depth++) {
    for (const input of Array.from(scope.querySelectorAll(SELECTOR))) {
      if (seen.has(input)) continue;
      seen.add(input);
      const r = input.getBoundingClientRect();
      if (r.height <= 0) continue;

      const rowTolerance = Math.max(r.height, lr.height, 12);
      const sameRow = Math.abs((r.y + r.height / 2) - (lr.y + lr.height / 2)) <= rowTolerance;
      const raw = (input.value || '').trim();
      const ph = (input.placeholder || '').trim();

      let score = 0;
      if (sameRow) score += 3;
      if (r.x >= lr.x) score += 1;
      // ⚠️ 模板字符串里必须写 \\d，否则 d 会变成 d，正则失效（这里踩过）
      if (/^-?\\d+([.,]\\d+)?$/.test(raw)) score += 2;
      if (/库存|数量|件/.test(ph)) score += 2;
      if (input.type === 'number') score += 1;

      // 层级越深越可能是整块表单，给一点点减分，让「近的、有数字的」胜出
      score -= depth;
      candidates.push({
        input,
        score,
        depth,
        raw,
        ph,
        attr: input.getAttribute('value') || '',
        type: input.type || '',
        x: Math.round(r.x),
        y: Math.round(r.y),
      });
    }
    // ⚠️ 这里**不能**「有候选就 break」：标签的最近一层可能只是说明文案的容器，
    // 里面那个 input 是空的，真正的数字框是再上一层的兄弟节点。
    // 所以一路扫到第 6 层，最后靠分数挑。
    scope = scope.parentElement;
  }

  if (!candidates.length) return { found: false, reason: 'no-input', candidates: [] };

  candidates.sort((a, b) => b.score - a.score);
  // 同分时优先「值（或 value 属性）本身就是数字」的那个
  const isNumeric = (v) => /^-?\\d+([.,]\\d+)?$/.test(v || '');
  const best =
    candidates.find((c) => isNumeric(c.raw) || isNumeric(c.attr)) ?? candidates[0];

  for (const c of candidates) c.input.removeAttribute('data-oba-stock');
  best.input.setAttribute('data-oba-stock', '1');

  return {
    found: true,
    value: best.raw,
    placeholder: best.ph,
    type: best.type,
    attr: best.attr,
    // 排查用：标签块和选中输入框的真实 HTML（各截断）
    labelHtml: (label.parentElement?.outerHTML || '').replace(/s+/g, ' ').slice(0, 260),
    inputHtml: (best.input.outerHTML || '').replace(/s+/g, ' ').slice(0, 200),
    scopeText: (best.input.parentElement?.innerText || label.parentElement?.innerText || '')
      .replace(/\\s+/g, ' ')
      .slice(0, 120),
    visible: true,
    // 仅供排查：最多 5 个候选
    candidates: candidates.slice(0, 5).map((c) => ({
      score: c.score,
      value: c.raw,
      placeholder: c.ph,
      type: c.type,
      at: [c.x, c.y],
    })),
  };
})()`

/** 「提交」在不同版本可能叫「保存 / 确定」，按优先级排列 */
const SUBMIT_TEXTS = ['提交', '保存', '确定', '确认提交', '确认保存', '保存修改'] as const

/**
 * 扫描提交类按钮。可见且可点的打上 `data-oba-submit="1"` 标记，便于后续直接点。
 *
 * ⚠️ 不能只看原生 `disabled`：eos 的按钮有时用 class（okee-btn-disabled）表达禁用，
 * 此时 `isDisabled()` 返回 false，点下去毫无反应。
 */
const PROBE_SUBMIT = `(() => {
  document.querySelectorAll('[data-oba-submit]').forEach((el) => el.removeAttribute('data-oba-submit'));
  const texts = ${JSON.stringify(SUBMIT_TEXTS)};
  const out = [];
  const nodes = Array.from(document.querySelectorAll('button, [role="button"], a'));
  for (const el of nodes) {
    const t = (el.textContent || '').replace(/\\s+/g, '');
    if (!texts.includes(t)) continue;
    const r = el.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0;
    const cls = el.getAttribute('class') || '';
    const disabled =
      el.disabled === true ||
      el.getAttribute('aria-disabled') === 'true' ||
      /disabled|is-disabled/i.test(cls);
    const ok = visible && !disabled;
    if (ok) el.setAttribute('data-oba-submit', t);
    out.push({ text: t, visible, disabled, marked: ok, cls: cls.slice(0, 50) });
  }
  return out;
})()`

/** 读当前「投放库存」输入框的值 + 附近提示文案（提交按钮卡住时用来写错误信息） */
const DESCRIBE_STOCK_FORM = `(() => {
  const input = document.querySelector('[data-oba-stock="1"]');
  if (!input) return { value: '(找不到输入框)', hint: '', scope: '' };
  const scope = input.parentElement || input.closest('div');
  const hints = [];
  if (scope) {
    for (const el of Array.from(
      scope.querySelectorAll('[class*="error"], [class*="help"], [class*="tip"], [class*="warn"]'),
    )) {
      const t = (el.textContent || '').replace(/\\s+/g, ' ').trim();
      if (t && t.length <= 60) hints.push(t);
    }
  }
  return {
    value: input.value,
    hint: Array.from(new Set(hints)).slice(0, 4).join(' / '),
    scope: (scope && scope.innerText ? scope.innerText : '').replace(/\\s+/g, ' ').slice(0, 100),
  };
})()`

/** 读当前「投放库存」输入框的值（含 value 为空的情况） */
const PROBE_STOCK_STATE = `(() => {
  const input = document.querySelector('[data-oba-stock="1"]');
  if (!input) return { found: false, value: '' };
  return { found: true, value: input.value || '' };
})()`

/**
 * 读「投放库存」当前值，**等它稳定**再取。
 *
 * ⚠️ 表单是先出空壳、再异步灌数据的。以前一读到空就当 0，
 * 于是「原值 + N」被算成「0 + N」，等于把活动库存改小了。
 * 这里要求值连续多次不变才认：有数字约 0.6 秒，为空要连等约 2.4 秒
 * （空值风险大得多，宁可多等一会）。
 */
async function readStockSettled(
  page: Page,
  target: import('playwright').Page | import('playwright').Frame,
  timeout: number,
): Promise<{ value: number | null; raw: string; settled: boolean }> {
  const deadline = Date.now() + timeout
  let last = ''
  let same = 0
  while (Date.now() < deadline) {
    const st = (await target.evaluate(PROBE_STOCK_STATE).catch(() => null)) as {
      found: boolean
      value: string
    } | null
    if (!st?.found) {
      await page.waitForTimeout(300)
      continue
    }
    if (st.value === last) {
      same++
    } else {
      last = st.value
      same = 0
    }
    const need = last.trim() === '' ? 8 : 2
    if (same >= need) return { value: parseQuantity(last), raw: last, settled: true }
    await page.waitForTimeout(300)
  }
  return { value: parseQuantity(last), raw: last, settled: false }
}

/** 立刻读一次原始值（不等待），用于写入后的覆盖检查 */
async function readStockRaw(
  target: import('playwright').Page | import('playwright').Frame,
): Promise<string> {
  const st = (await target.evaluate(PROBE_STOCK_STATE).catch(() => null)) as {
    found: boolean
    value: string
  } | null
  return st?.found ? st.value : ''
}

/**
 * 把数字写进「投放库存」。
 *
 * ⚠️ 只 dispatch input 事件在部分版本里会被 React 忽略：值显示变了，但表单的校验状态
 * 没更新，「提交」按钮一直灰着。所以优先用**真实键盘输入**（keydown → input → blur），
 * 不行再用原生 setter 兜底，最后回读确认值真的进去了。
 */
async function fillStockInput(
  target: import('playwright').Page | import('playwright').Frame,
  next: number,
  trace: string[],
): Promise<{ ok: boolean; value: string; reason?: string }> {
  const wanted = String(next)
  let input = target.locator('[data-oba-stock="1"]').first()
  if ((await input.count().catch(() => 0)) === 0) {
    return { ok: false, value: '', reason: '页面重渲染后找不到标记过的输入框' }
  }

  /**
   * 回读输入框的值。
   * ⚠️ 失焦后页面可能整块重渲染，原来的 DOM 节点被换掉（标记也一起没了），
   * 这时要重新跑一次查找再读，否则会「明明写进去了却判成没写」。
   */
  const readBack = async (): Promise<string | null> => {
    if ((await input.count().catch(() => 0)) > 0) {
      return (await input.inputValue().catch(() => '')).trim()
    }
    const again = (await target.evaluate(FIND_STOCK_INPUT).catch(() => ({ found: false }))) as {
      found: boolean
      value?: string
    }
    if (!again.found) return null
    input = target.locator('[data-oba-stock="1"]').first()
    return (again.value || '').trim()
  }

  // 1) 真实键盘输入
  const focused = await input
    .click({ timeout: 3000 })
    .then(() => true)
    .catch(() => false)
  if (focused) {
    await input.press('ControlOrMeta+a').catch(() => {})
    await input.press('Backspace').catch(() => {})
    await input.pressSequentially(wanted, { delay: 70 }).catch(() => {})
    // 很多表单的校验挂在 blur 上，不先失焦按钮不会亮
    await input.press('Tab').catch(() => {})
    const typed = await readBack()
    if (typed !== null && parseQuantity(typed) === next) {
      trace.push(`投放库存填 ${next}（键盘输入）`)
      return { ok: true, value: typed }
    }
  }

  // 2) 原生 setter 兜底（自定义输入组件不吃键盘事件时）
  if ((await input.count().catch(() => 0)) === 0) {
    const current = await readBack()
    if (current !== null && parseQuantity(current) === next) {
      trace.push(`投放库存填 ${next}（键盘输入·节点已重建）`)
      return { ok: true, value: current }
    }
    return { ok: false, value: current ?? '', reason: '写入时输入框已被重渲染移除' }
  }
  const fallback = (await input
    .evaluate((el, value) => {
      const node = el as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(node, String(value))
      node.dispatchEvent(new Event('input', { bubbles: true }))
      node.dispatchEvent(new Event('change', { bubbles: true }))
      node.blur()
      return node.value
    }, next)
    .catch(() => '')) as string
  const value = (fallback || '').trim() || (await readBack()) || ''
  if (parseQuantity(value) === next) {
    trace.push(`投放库存填 ${next}（setter）`)
    return { ok: true, value }
  }
  return { ok: false, value, reason: `输入框回读为 "${value}"，期望 "${wanted}"` }
}

/**
 * 等「提交」变成可点。
 *
 * ⚠️ 这是补货失败的主要来源：点完「编辑」后表单是**异步灌数据**的，刚填完值的瞬间
 * 校验还没跑完，按钮必然是 disabled。以前填完立刻判定，正常值也会被判成
 * 「超出可售库存」，于是十次里失败七八次。
 */
async function waitSubmitReady(
  page: Page,
  target: import('playwright').Page | import('playwright').Frame,
  timeout: number,
): Promise<import('playwright').Locator | null> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    // 每次都重新扫一遍：按钮的可用状态是随校验异步变的
    await target.evaluate(PROBE_SUBMIT).catch(() => [])
    // 按「提交 → 保存 → 确定」的优先级取，避免误点同一屏里的其它按钮
    for (const text of SUBMIT_TEXTS) {
      const btn = target.locator(`[data-oba-submit="${text}"]`).first()
      if ((await btn.count().catch(() => 0)) > 0 && (await btn.isVisible().catch(() => false))) {
        return btn
      }
    }
    await page.waitForTimeout(300)
  }
  return null
}

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
type StockCandidate = {
  score: number
  value: string
  placeholder: string
  type: string
  at: number[]
}

type StockInputInfo = {
  target: import('playwright').Page | import('playwright').Frame
  value: string
  /** DOM 上的 value 属性（有的组件只更新 attribute 不更新 property） */
  attr: string
  placeholder: string
  type: string
  scopeText: string
  candidates: StockCandidate[]
  labelHtml: string
  inputHtml: string
}

async function locateStockInput(page: Page): Promise<StockInputInfo | null> {
  for (const target of allTargets(page)) {
    const found = (await target.evaluate(FIND_STOCK_INPUT).catch(() => ({ found: false }))) as
      | {
          found: true
          value: string
          placeholder: string
          type: string
          scopeText: string
          attr?: string
          labelHtml?: string
          inputHtml?: string
          candidates?: StockCandidate[]
          visible: boolean
        }
      | { found: false }
    if (found.found && found.visible) {
      return {
        target,
        value: found.value,
        attr: found.attr ?? '',
        placeholder: found.placeholder,
        type: found.type,
        scopeText: found.scopeText,
        candidates: found.candidates ?? [],
        labelHtml: found.labelHtml ?? '',
        inputHtml: found.inputHtml ?? '',
      }
    }
  }
  return null
}

/** 轮询等「投放库存」出现（跨所有 frame） */
async function waitForStockInput(page: Page, timeout: number): Promise<StockInputInfo | null> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
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

/** 描述当前抽屉内部：文字、按钮、是否 iframe（排查「抽屉开了但找不到编辑」） */
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
  // 失败时留一张现场截图，方便在别的机器上排查
  await takeScreenshot(page, '秒杀补货').catch(() => {})
  const drawer = await describeDrawer(page).catch(() => '{}')
  trace.push(
    `${editClicked ? '点了编辑但没等到投放库存' : '抽屉已打开但没找到「编辑」'}；抽屉内容=${drawer}；各 frame 文字=${frameText || '(空)'}`,
  )
  return false
}

/** 页面当前可见的短文本（排查用，控制在 25 条以内） */
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

  // ⚠️ 输入框会先以空壳出现，数据是异步灌进来的：空着 ≠ 真的是 0。
  //    所以先等值稳定（空值要多等一会），再拿它当基准。
  const settled = await readStockSettled(page, uiTarget, 8000)
  let beforeValue = settled.value
  if (beforeValue === null && settled.raw.trim() !== '') {
    // 有内容但不是数字 → 多半抓错了框，退回 placeholder / 附近文案再试
    beforeValue = parseStockFromScopeText(located.scopeText)
  }
  if (beforeValue === null && settled.raw.trim() === '') {
    // 等稳了还是空 → 该活动确实还没投放库存，补货 +N 等于设为 N
    beforeValue = 0
    trace.push(`投放库存输入框持续为空（${settled.settled ? '已稳定' : '等满 8 秒'}），按 0 处理`)
  }

  if (beforeValue === null) {
    const cand = located.candidates
      .map(c => `[分${c.score} value="${c.value}" ph="${c.placeholder}" ${c.type || 'text'}]`)
      .join(' ')
    throw new Error(
      `「投放库存」当前值不是数字：value="${located.value}" ` +
        `placeholder="${located.placeholder}" type=${located.type || '(无)'} ` +
        `附近文字="${located.scopeText}"；候选：${cand || '无'}；` +
        `输入框HTML=${located.inputHtml}；标签块HTML=${located.labelHtml}`,
    )
  }
  let nextValue = beforeValue + addCount
  timings.readStockMs = Date.now() - readStarted

  // 3.5) 填值 → 回读校验 → 等按钮可用 → 提交
  //      两道时序关卡：
  //      a) 填完按钮要等一次 React 重渲染 + 异步校验才会亮，必须轮询；
  //      b) 页面可能在我们写完的瞬间才把数据灌回来，把值冲掉——
  //         所以写完先等 1.2 秒回读一次，被覆盖就拿真实值重算，最多三轮。
  const submitStarted = Date.now()
  let submitBtn: import('playwright').Locator | null = null
  let filledValue = ''

  for (let attempt = 1; attempt <= 3 && !submitBtn; attempt++) {
    const filled = await fillStockInput(uiTarget, nextValue, trace)
    filledValue = filled.value
    if (!filled.ok) {
      throw new Error(`写入「投放库存」失败（${filled.reason}）`)
    }

    // a/b 的顺序不能反：先确认值还在，再等按钮
    await page.waitForTimeout(1200)
    const nowRaw = await readStockRaw(uiTarget)
    const nowValue = parseQuantity(nowRaw)
    if (nowValue !== null && nowValue !== nextValue) {
      nextValue = nowValue + addCount
      trace.push(`第${attempt}轮写入被页面覆盖（读到 ${nowRaw}），按真实值重算为 ${nextValue}`)
      continue
    }

    submitBtn = await waitSubmitReady(page, uiTarget, attempt === 1 ? 8000 : 6000)
    if (!submitBtn && attempt < 3) {
      trace.push(`第${attempt}轮提交按钮不可用，重填一次`)
      await page.waitForTimeout(1000)
    }
  }

  if (!submitBtn) {
    const form = (await uiTarget.evaluate(DESCRIBE_STOCK_FORM).catch(() => null)) as {
      value: string
      hint: string
      scope: string
    } | null
    const probes = (await uiTarget.evaluate(PROBE_SUBMIT).catch(() => [])) as Array<{
      text: string
      visible: boolean
      disabled: boolean
      cls: string
    }>
    const btnState =
      probes
        .map(
          p =>
            `${p.text}${p.visible ? '' : '(不可见)'}${p.disabled ? `(禁用 cls=${p.cls})` : '(可用)'}`,
        )
        .join('、') || '页面上没有「提交/保存/确定」按钮'
    const available = parseAvailableFromScopeText(form?.scope || located.scopeText)
    throw new Error(
      '「提交」按钮一直不可用，库存没写进表单或被校验挡住：' +
        `输入框当前值="${form?.value ?? filledValue}"，按钮=${btnState}，` +
        `附近提示="${form?.hint || '无'}"，附近文字="${form?.scope || located.scopeText}"` +
        (available !== null ? `，可售库存 ${available}` : '') +
        (available === 0
          ? '（可售库存为 0 通常是商品本身库存已售完，需要先在商品库存里补，秒杀这边才能加）'
          : '') +
        `；步骤：${trace.join(' → ')}`,
    )
  }
  await submitBtn.click()
  timings.submitMs = Date.now() - submitStarted
  trace.push(`已点提交（${nextValue}）`)

  // 5) 提交之后：**同时**盯两个信号，谁先到算谁
  //    - 表单收起（输入框消失/不可见，或出现成功提示）
  //    - 列表里的剩余库存真的变了
  //    以前是先等表单关闭、再查库存，可有些版本提交成功后编辑页根本不收起，
  //    于是永远判不出「关闭」，明明补成功也报「没捕获到表单关闭」。
  const verifyStarted = Date.now()
  let sawSuccessText = false
  let closed = false
  let after: number | null = null

  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (!closed) {
      const found = (await uiTarget.evaluate(FIND_STOCK_INPUT).catch(() => ({
        found: false,
        visible: false,
      }))) as { found: boolean; visible?: boolean }

      // 表单收起来后，输入框可能只是被隐藏（仍留在 DOM 里），所以判「不可见」也算关闭
      if (!found.found || found.visible === false) {
        closed = true
      }

      // 第二个信号：提交后回到「秒杀详情」视图（「编辑」按钮重新出现）
      if (!closed) {
        const backToDetail = await uiTarget
          .locator('button:text-is("编辑"), :text-is("编辑")')
          .last()
          .isVisible()
          .catch(() => false)
        if (backToDetail) closed = true
      }

      // 第三个信号：页面出现成功提示
      if (!closed) {
        const successText = await uiTarget
          .evaluate(() =>
            /提交成功|保存成功|操作成功|已提交|审核中/.test(document.body?.innerText || ''),
          )
          .catch(() => false)
        if (successText) {
          sawSuccessText = true
          closed = true
        }
      }
    }

    // 库存变了就是铁证，不管表单有没有收起
    const text = await row.innerText().catch(() => '')
    const parsed = parseRowText(text)
    if (parsed.stock !== null && parsed.stock !== before.stock) {
      after = parsed.stock
      break
    }

    // 表单已收起但列表迟迟不刷新，就别干等了
    if (closed && Date.now() - verifyStarted > 6000) break

    await page.waitForTimeout(600)
  }

  timings.verifyMs = Date.now() - verifyStarted

  const verified = after !== null
  // 写入过程中可能被页面覆盖后重算过，基准值以最终提交的为准
  const effectiveBefore = nextValue - addCount
  return {
    index,
    title: before.title,
    before: effectiveBefore,
    next: nextValue,
    beforeStock: before.stock,
    afterStock: after,
    verified,
    closed,
    message: verified
      ? `投放库存 ${effectiveBefore} → ${nextValue}，剩余库存已变为 ${after}（合计 ${Date.now() - startedAt}ms）`
      : closed
        ? `投放库存已提交（${effectiveBefore} → ${nextValue}）${
            sawSuccessText ? '，页面已提示成功' : ''
          }，列表可能还没刷新`
        : '已点提交：表单没收起、也没读到库存变化（可能仍在提交，或列表没刷新），请到页面核对',
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
