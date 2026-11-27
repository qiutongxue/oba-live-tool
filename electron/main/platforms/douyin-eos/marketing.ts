import type { Locator, Page } from 'playwright'
import { parseDurationText, sleep } from '#/utils'
import { MARKETING } from './constant'

/**
 * 抖音团购（eos）营销工具 —— 福袋 / 优惠券 的 DOM 自动化助手。
 *
 * 这些函数基于 2026-10 对 eos 直播中控台的实测抓取编写，选择器原则：
 *  1. 只用稳定前缀（`okee-marketing-*` / `okee-current-live-*`）+ 文本匹配 + `#id`；
 *  2. 绝不依赖带哈希的 CSS Module 类名（会随前端发版变化）；
 *  3. 所有弹窗都是 Drawer 组件，操作完必须关闭，否则会挡住后续操作。
 */

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 等待并返回第一个「可见」的、文本完全匹配的元素（div / a / button 都能命中） */
export async function waitVisibleExactText(
  page: Page,
  text: string,
  timeout = 15000,
  scopeSelector?: string,
): Promise<Locator> {
  const scope = scopeSelector ? page.locator(scopeSelector) : page
  const all = scope.locator(`:text-is("${text}")`)
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const n = await all.count()
    for (let i = 0; i < n; i++) {
      const el = all.nth(i)
      if (await el.isVisible().catch(() => false)) return el
    }
    await sleep(300)
  }
  throw new Error(`等待可见文本「${text}」超时`)
}

/** 点击第一个可见的、文本完全匹配的元素 */
export async function clickVisibleExactText(
  page: Page,
  text: string,
  timeout = 10000,
  scopeSelector?: string,
): Promise<void> {
  const el = await waitVisibleExactText(page, text, timeout, scopeSelector)
  await el.click()
}

/** 等表格数据行渲染出来（列表是异步加载的，「创建」按钮先出现、数据后到） */
export async function waitForTableRows(page: Page, timeout = 15000): Promise<number> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const n = await page
      .locator(MARKETING.TABLE_ROW)
      .count()
      .catch(() => 0)
    if (n > 0) return n
    await sleep(400)
  }
  return 0
}

/** 打开左下角「营销工具」里指定的磁贴，并等待目标弹窗出现 */
export async function openMarketingTile(
  page: Page,
  tileName: string,
  readySelector: string,
): Promise<void> {
  const container = page.locator(MARKETING.TILE_CONTAINER)
  await container.waitFor({ state: 'visible', timeout: 30000 })

  await clickVisibleExactText(page, tileName, 10000, MARKETING.TILE_CONTAINER)

  try {
    await page.waitForSelector(readySelector, { timeout: 8000, state: 'visible' })
    return
  } catch {
    // 回退：直接点整个磁贴容器
  }
  const item = container.locator('div[class*="item"]').filter({ hasText: tileName }).first()
  await item.click()
  await page.waitForSelector(readySelector, { timeout: 10000, state: 'visible' })
}

/**
 * 关闭所有已打开的 Drawer。
 * 优先点右上角关闭按钮，兜底点遮罩；循环处理嵌套弹窗。
 */
export async function closeAllDrawers(page: Page): Promise<boolean> {
  for (let round = 0; round < 5; round++) {
    const dialogs = page.locator(MARKETING.DRAWER_DIALOG)
    const dn = await dialogs.count()
    let anyOpen = false
    for (let i = 0; i < dn; i++) {
      if (
        await dialogs
          .nth(i)
          .isVisible()
          .catch(() => false)
      ) {
        anyOpen = true
        break
      }
    }
    if (!anyOpen) {
      // 抽屉隐藏后遮罩可能因收尾动画才移除；残留的遮罩会挡住其他任务
      // （如自动弹窗）的点击，所以这里再等它彻底消失
      await page
        .waitForSelector(MARKETING.DRAWER_MASK, { state: 'detached', timeout: 3000 })
        .catch(() => {})
      return true
    }

    const targets = page.locator(`${MARKETING.DRAWER_CLOSE}, ${MARKETING.DRAWER_MASK}`)
    const tn = await targets.count()
    let clicked = false
    // 从后往前：优先关最上层
    for (let i = tn - 1; i >= 0; i--) {
      const el = targets.nth(i)
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 3000 }).catch(() => {})
        clicked = true
        await sleep(800)
        break
      }
    }
    if (!clicked) return false
  }
  return false
}

/** 读取某一行的某个单元格文本（优先用 aria-colindex，回退按位置） */
async function cellText(row: Locator, ariaColIndex: number): Promise<string> {
  let text = await row
    .locator(`td[aria-colindex="${ariaColIndex}"]`)
    .first()
    .innerText()
    .catch(() => '')
  if (!text) {
    text = await row
      .locator(`td:nth-child(${ariaColIndex})`)
      .first()
      .innerText()
      .catch(() => '')
  }
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 选择弹窗里的单选选项，如「50张」「5分钟」（label 内含 input[type=radio]）。
 *
 * 点击后会**校验 radio 是否真的被选中**：eos 的 label 里还有装饰性 span/遮挡层，
 * 点 label 不保证能切换 input，选不上会直接导致主提交按钮保持 disabled。
 */
export async function pickRadio(page: Page, text: string): Promise<boolean> {
  const label = page
    .locator('label:has(> input[type="radio"])')
    .filter({ hasText: new RegExp(`^${escapeRegExp(text)}$`) })
    .first()
  if ((await label.count()) === 0) return false

  const input = label.locator('input[type="radio"]').first()
  if (await input.isChecked().catch(() => false)) return true

  await label.click()
  if (await input.isChecked().catch(() => false)) return true

  // 兜底：直接点 input 本体
  await input.click({ force: true }).catch(() => {})
  return await input.isChecked().catch(() => false)
}

// ==================== 发放规模（张 / 元 自动识别） ====================

/** 发放规模的解析结果 */
type CouponScale = { kind: 'all' } | { kind: 'value'; num: number; unit: '张' | '元' | null }

/**
 * 解析用户填的「发放规模」。
 *
 * 平台补贴券的规模按「元」算，普通券按「张」算，界面只给一个输入框，
 * 所以单位可以省略——不带单位时按弹窗里实际出现的单位自动识别。
 * 支持：50张 / 5000元 / 5,000元 / 5000 / 全部库存。
 */
export function parseCouponScale(raw: string): CouponScale {
  const text = (raw ?? '').replace(/\s+/g, '')
  if (!text) throw new Error('发放规模不能为空：请填「50张」或「5000元」这类值')
  if (text.includes('全部')) return { kind: 'all' }

  const matched = text.match(/^([\d,]+(?:\.\d+)?)(张|元)?$/)
  if (!matched) {
    throw new Error(`发放规模「${raw}」无法识别：只支持「50张」「5000元」「5000」或「全部库存」`)
  }
  const num = Number(matched[1].replace(/,/g, ''))
  if (!Number.isFinite(num) || num <= 0) throw new Error(`发放规模「${raw}」不是有效数字`)
  const unit = (matched[2] as '张' | '元' | undefined) ?? null
  return { kind: 'value', num, unit }
}

/** 页面内扫描：找出「发放规模」那一组单选项，以及这一组用的是什么单位 */
const PROBE_SCALE_OPTIONS = `(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.width > 0
  }
  const allLabels = Array.from(document.querySelectorAll('label')).filter(
    (l) => l.querySelector('input[type="radio"]') && visible(l),
  )
  const textOf = (el) => (el.innerText || el.textContent || '').replace(/\\s+/g, '')

  // 优先只看「发放规模 / 发放数量」所在容器里的单选项，避免把券面额之类的「元」认成规模单位
  let scoped = []
  for (const label of allLabels) {
    let scope = label.parentElement
    for (let depth = 0; depth < 4 && scope; depth++) {
      const t = scope.innerText || ''
      if (/发放规模|发放数量|发放张数/.test(t)) {
        scoped = Array.from(scope.querySelectorAll('label')).filter(
          (l) => l.querySelector('input[type="radio"]') && visible(l),
        )
        break
      }
      scope = scope.parentElement
    }
    if (scoped.length > 0) break
  }

  const picked = scoped.length > 0 ? scoped : allLabels
  const texts = picked.map(textOf).filter(Boolean)
  const unit = texts.some((t) => t.includes('元'))
    ? '元'
    : texts.some((t) => t.includes('张'))
      ? '张'
      : null
  return { texts, unit, scoped: scoped.length > 0 }
})()`

/** 在弹窗里标记「发放规模」的数字输入框（有些券没有单选项，只给一个输入框） */
const MARK_SCALE_INPUT = `(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.width > 0
  }
  document.querySelectorAll('[data-oba-scale]').forEach((el) => el.removeAttribute('data-oba-scale'))
  const inputs = Array.from(document.querySelectorAll('input')).filter((el) => {
    const type = (el.getAttribute('type') || 'text').toLowerCase()
    return (type === 'text' || type === 'number') && visible(el)
  })
  let best = null
  let bestScore = -1
  for (const input of inputs) {
    let scope = input.parentElement
    let text = ''
    for (let depth = 0; depth < 4 && scope; depth++) {
      text += ' ' + (scope.innerText || '')
      scope = scope.parentElement
    }
    let score = 0
    if (/发放规模|发放数量|发放张数|预算/.test(text)) score += 3
    if (/元|张/.test(text)) score += 1
    if ((input.getAttribute('type') || '').toLowerCase() === 'number') score += 1
    if (score > bestScore) {
      bestScore = score
      best = input
    }
  }
  // 只有一个输入框时直接用它（弹窗里除了规模没有别的数字项）
  if (best && bestScore <= 0 && inputs.length > 1) best = null
  if (!best) return null
  best.setAttribute('data-oba-scale', '1')
  return { placeholder: best.getAttribute('placeholder') || '', value: best.value }
})()`

/** 把数字写进「发放规模」输入框，写完回读确认 */
async function fillScaleInput(page: Page, num: number): Promise<boolean> {
  const found = (await page.evaluate(MARK_SCALE_INPUT).catch(() => null)) as {
    placeholder: string
  } | null
  if (!found) return false

  const input = page.locator('[data-oba-scale="1"]').first()
  if ((await input.count().catch(() => 0)) === 0) return false

  const wanted = String(num)
  const normalize = (v: string) => v.replace(/[\s,]/g, '')

  const clicked = await input
    .click({ timeout: 3000 })
    .then(() => true)
    .catch(() => false)
  if (clicked) {
    await input.press('ControlOrMeta+a').catch(() => {})
    await input.press('Backspace').catch(() => {})
    await input.pressSequentially(wanted, { delay: 60 }).catch(() => {})
    await input.press('Tab').catch(() => {})
    await sleep(200)
    if (normalize(await input.inputValue().catch(() => '')) === wanted) return true
  }

  // 兜底：原生 setter（自定义输入组件不吃键盘事件时）
  const fallback = (await input
    .evaluate((el, value) => {
      const node = el as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(node, String(value))
      node.dispatchEvent(new Event('input', { bubbles: true }))
      node.dispatchEvent(new Event('change', { bubbles: true }))
      node.blur()
      return node.value
    }, num)
    .catch(() => '')) as string
  return normalize(fallback) === wanted
}

/**
 * 设置「发放规模」。
 *
 * 1. 先看弹窗里这一组选项用的是「张」还是「元」，用户没写单位就按它来（自动识别）；
 * 2. 能命中现成的单选项（如 50张 / 5000元）就直接选；
 * 3. 选不到就点「自定义」再填数字；
 * 4. 还没有就找弹窗里的数字输入框直接填；
 * 5. 都不行时把页面上实际有哪些选项带出来，方便定位。
 */
export async function applyCouponScale(page: Page, raw: string): Promise<void> {
  const rawText = (raw ?? '').trim()
  const probe = (await page.evaluate(PROBE_SCALE_OPTIONS).catch(() => null)) as {
    texts: string[]
    unit: '张' | '元' | null
  } | null
  const optionTexts = probe?.texts ?? []
  const optionList = optionTexts.join(' / ') || '无'

  // 0) 选项通常来自界面下拉（就是页面上的原文，如「全部预算」「5000元」），先按原样点
  if (rawText && (await pickRadio(page, rawText))) return

  let parsed: CouponScale
  try {
    parsed = parseCouponScale(rawText)
  } catch (err) {
    throw new Error(
      `${err instanceof Error ? err.message : String(err)}；弹窗里可选择的是：${optionList}`,
    )
  }

  if (parsed.kind === 'all') {
    // 「全部」在不同券上叫「全部库存」「全部预算」，不写死文案：取第一个「全部」开头的选项
    const allOption = optionTexts.find(text => text.startsWith('全部'))
    if (allOption && (await pickRadio(page, allOption))) return
    if (await pickRadio(page, '全部库存')) return
    throw new Error(`发券弹窗里没有「全部」类选项，当前可选：${optionList}`)
  }

  const unit = parsed.unit ?? probe?.unit ?? '张'
  if (parsed.unit && probe?.unit && parsed.unit !== probe.unit) {
    throw new Error(
      `这张券的发放规模按「${probe.unit}」算，但填的是「${parsed.unit}」：` +
        `请改成「${parsed.num}${probe.unit}」或直接填「${parsed.num}」`,
    )
  }

  // 1) 命中现成选项：5000元 / 5,000元 / 50张
  const withUnit = `${parsed.num}${unit}`
  const thousands = `${parsed.num.toLocaleString('zh-CN')}${unit}`
  for (const candidate of new Set([withUnit, thousands])) {
    if (await pickRadio(page, candidate)) return
  }

  // 2) 「自定义」+ 输入框
  const customSelected = await pickRadio(page, '自定义')
  if (customSelected) {
    await sleep(300)
    if (await fillScaleInput(page, parsed.num)) return
  }

  // 3) 直接找输入框（有些券只有一个数字框）
  if (await fillScaleInput(page, parsed.num)) return

  throw new Error(
    `没能设置发放规模「${rawText}」：弹窗里可选的规模是「${optionList}」，也没有找到能填数字的输入框`,
  )
}

/**
 * 提交后可能出现的二次确认弹窗（文本**精确等于**「确定」/「确认」）。
 *
 * ⚠️ 这里必须用精确文本，绝不能用 `button:has-text("确定")`：
 * Playwright 的 `:has-text()` 是**子串匹配**，`"确定"` 会命中主提交按钮
 * `确定发放` / `确定提交` 本身。而主提交按钮在点击后进入 `disabled + loading`，
 * 弹窗随后关闭使元素 detach —— 于是这里会空等 30s 后抛超时，
 * **把一次其实已经成功的提交误判为失败**（2026-10-16 实测踩到）。
 *
 * 另外只点击「可见且可用」的按钮，找不到就直接放弃，不做长时间等待。
 */
export async function clickConfirmIfAny(page: Page, timeout = 3000): Promise<boolean> {
  for (const t of ['确定', '确认']) {
    const btns = page.locator('button').filter({ hasText: new RegExp(`^${escapeRegExp(t)}$`) })
    const n = await btns.count()
    for (let i = 0; i < n; i++) {
      const btn = btns.nth(i)
      if (!(await btn.isVisible().catch(() => false))) continue
      if (await btn.isDisabled().catch(() => true)) continue
      await btn.click({ timeout }).catch(() => {})
      await sleep(1200)
      return true
    }
  }
  return false
}

/**
 * 点击「确定发放」后等待**发券弹窗关闭**，期间反复点掉二次确认。
 *
 * 与福袋 `waitGiftBagFormClosed` 同源的问题（2026-10-18 一并修复）：
 * 原来先 `waitForSubmitSettled` 再「点一次」确认，二次确认弹窗晚渲染时会漏点，
 * 随后 `closeAllDrawers` 把弹窗关掉 = 替用户点了取消，但函数照样返回成功。
 *
 * @returns true = 弹窗已关闭；false = 超时仍未关闭
 */
async function waitCouponDialogClosed(page: Page, timeout = 10000): Promise<boolean> {
  const deadline = Date.now() + timeout
  // 先给 loading 状态出现的时间
  await sleep(800)
  let confirmClicks = 0

  while (Date.now() < deadline) {
    if (confirmClicks < 3 && (await clickConfirmIfAny(page, 2000))) {
      confirmClicks += 1
      await sleep(400)
      continue
    }

    const confirm = page.locator(MARKETING.COUPON.CONFIRM)
    const n = await confirm.count().catch(() => 0)
    if (n === 0) return true
    if (
      !(await confirm
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      return true
    }
    await sleep(300)
  }
  return false
}

/**
 * 在某一行内轮询等待某个按钮出现并可见。
 *
 * eos 的行内操作按钮是**异步刷新**的：点「停止发券」之后，页面不会立刻把
 * 该行换成「发放优惠券」，往往要等几秒（甚至更久）才更新。直接查一次就报错
 * 会误判为失败（2026-10-16 实测踩到）。
 */
async function waitForRowButton(row: Locator, selector: string, timeout = 30000): Promise<boolean> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const btn = row.locator(selector).first()
    if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) return true
    await sleep(500)
  }
  return false
}

// ============================ 福袋 ============================

/** 读取「本场直播福袋」列表（读完后自动关闭弹窗） */
export async function readGiftBagTemplates(page: Page): Promise<GiftBagTemplate[]> {
  await openMarketingTile(page, MARKETING.GIFT_BAG.TILE, MARKETING.GIFT_BAG.MODAL_READY)
  try {
    await waitForTableRows(page)
    const rows = await page.locator(MARKETING.TABLE_ROW).all()
    const result: GiftBagTemplate[] = []
    for (const row of rows) {
      // 只取含「复制」的数据行
      const hasCopy = await row.locator(`:text-is("${MARKETING.GIFT_BAG.COPY_TEXT}")`).count()
      if (!hasCopy) continue

      const descCell = await row
        .locator('td')
        .first()
        .innerText()
        .catch(() => '')
      const statusCell = await cellText(row, MARKETING.GIFT_BAG.COL_SEND_TIME - 1)
      const sendTime = await cellText(row, MARKETING.GIFT_BAG.COL_SEND_TIME)

      const status =
        statusCell.match(/(发放中|已开奖|待发放|审核中|未过审|已下线)/)?.[1] ?? statusCell
      result.push({
        index: result.length + 1,
        desc: descCell.replace(/\s+/g, ' ').trim().slice(0, 120),
        status,
        // 原始文本可能带剩余时间（如「发放中 02:31」），循环任务靠它估算下次检查时间
        statusText: statusCell,
        sendTime,
      })
    }
    return result
  } finally {
    await closeAllDrawers(page)
  }
}

/**
 * 读取表单里当前选中的「时长」单选（「1分钟」「10分钟」这类）。
 * 表单里有多个单选组（参与条件、领取方式…），用文本格式把它们区分开。
 * 读不到（例如选的是需要手填的「自定义」）返回 null。
 */
async function readSelectedDuration(page: Page): Promise<string | null> {
  const checkedLabels = page.locator('label:has(> input[type="radio"]:checked)')
  const count = await checkedLabels.count().catch(() => 0)
  for (let i = 0; i < count; i++) {
    const label = checkedLabels.nth(i)
    const raw = (await label.innerText().catch(() => '')) || ''
    const text = raw.replace(/\s+/g, '').trim()
    if (/^\d+(秒|分钟|小时)$/.test(text)) return text
  }
  return null
}

/**
 * 提交阶段的等待参数。
 *
 * ⚠️ 慢机器/慢网络下，eos 从「点提交」到「响应回来、抽屉关闭」十几秒很常见。
 * 之前固定等 10 秒就判超时，而超时后又会关抽屉（= 取消提交），
 * 于是表现为「偶发发不出去」「卡住」（2026-10-24 定位）。
 */
const SUBMIT_TIMING = {
  /** 点提交后先给 loading 出现的时间 */
  graceMs: 1200,
  /** 表单可见、但既不在提交中也没关闭，持续这么久 → 认为没提交成功（如校验未通过） */
  idleTimeoutMs: 15000,
  /** 一直处于「提交中」最多等这么久（给慢机器留余量） */
  submittingTimeoutMs: 60000,
  /** 最多点几次二次确认（防止误触） */
  maxConfirmClicks: 3,
} as const

/** 判断提交按钮是否处于「提交中」：disabled，或者带 loading 类名 */
async function isSubmitting(btn: Locator): Promise<boolean> {
  if (await btn.isDisabled().catch(() => false)) return true
  const cls = (await btn.getAttribute('class').catch(() => '')) ?? ''
  return /loading|spin/i.test(cls)
}

/**
 * 点击「提交审核」后等待提交结束，期间反复点掉二次确认弹窗。
 *
 * 三种结果，调用方据此决定「能不能关抽屉」：
 * - `closed`     抽屉消失（提交成功的正常表现）
 * - `idle`       表单还在、按钮可用且一直没进入提交态 → 多半被校验/服务端拒绝
 * - `submitting` 一直卡在提交中 → 请求还没回来，**此时绝不能关抽屉（等于取消）**
 */
async function waitGiftBagSubmitOutcome(page: Page): Promise<GiftBagSubmitOutcome> {
  const started = Date.now()
  await sleep(SUBMIT_TIMING.graceMs)

  let confirmClicks = 0
  let idleSince: number | null = null

  while (true) {
    const elapsed = Date.now() - started

    // 1) 二次确认可能延迟数秒才渲染，边等边点
    if (confirmClicks < SUBMIT_TIMING.maxConfirmClicks && (await clickConfirmIfAny(page, 2000))) {
      confirmClicks += 1
      idleSince = null
      await sleep(500)
      continue
    }

    // 2) 抽屉消失 = 提交已结束
    const submit = page.locator(MARKETING.GIFT_BAG.SUBMIT)
    const n = await submit.count().catch(() => 0)
    if (n === 0) return 'closed'
    const btn = submit.first()
    if (!(await btn.isVisible().catch(() => false))) return 'closed'

    // 3) 还在提交中 → 继续等（慢机器最多等 60 秒）
    if (await isSubmitting(btn)) {
      idleSince = null
      if (elapsed > SUBMIT_TIMING.submittingTimeoutMs) return 'submitting'
      await sleep(400)
      continue
    }

    // 4) 可见且空闲：可能还没开始提交，也可能被拒绝
    idleSince ??= Date.now()
    if (Date.now() - idleSince > SUBMIT_TIMING.idleTimeoutMs) return 'idle'
    await sleep(400)
  }
}

/**
 * 重新打开福袋弹窗，数一下当前列表有多少数据行；读不到返回 null。
 * 用于提交后校验「列表里是否真的多了一条」。
 */
async function countGiftBagRows(page: Page): Promise<number | null> {
  try {
    await closeAllDrawers(page)
    await openMarketingTile(page, MARKETING.GIFT_BAG.TILE, MARKETING.GIFT_BAG.MODAL_READY)
    await waitForTableRows(page, 15000)
    return await page
      .locator(MARKETING.TABLE_ROW)
      .count()
      .catch(() => 0)
  } catch {
    return null
  } finally {
    await closeAllDrawers(page)
  }
}

/**
 * 复制第 index 个福袋模板并提交审核（走页面「免审规则」）。
 * index 与 readGiftBagTemplates 返回的序号一致。
 *
 * 返回表单里记录的时长（供营销循环估算下次检查时间），
 * 以及提交后是否在列表里**确认到新增**（`verified`）。
 */
export async function sendGiftBagByIndex(page: Page, index: number): Promise<SendGiftBagResult> {
  const startedAt = Date.now()
  // 各阶段耗时：慢机器排障时看这一行就知道卡在哪儿
  const timings: GiftBagTimings = { listMs: 0, formMs: 0, submitMs: 0, verifyMs: 0, totalMs: 0 }

  await openMarketingTile(page, MARKETING.GIFT_BAG.TILE, MARKETING.GIFT_BAG.MODAL_READY)
  try {
    await waitForTableRows(page)
    timings.listMs = Date.now() - startedAt

    // 提交前记录列表行数，提交后用它校验是否真的新增了一条
    const beforeRows = await page
      .locator(MARKETING.TABLE_ROW)
      .count()
      .catch(() => 0)

    const copyRows = page
      .locator('tr')
      .filter({ has: page.locator(`:text-is("${MARKETING.GIFT_BAG.COPY_TEXT}")`) })
    const count = await copyRows.count()
    if (count === 0) throw new Error('福袋列表为空，找不到可复制的福袋')
    if (index < 1 || index > count) {
      throw new Error(`福袋序号 ${index} 超出范围（当前共 ${count} 个）`)
    }

    const targetRow = copyRows.nth(index - 1)
    await targetRow.locator(`:text-is("${MARKETING.GIFT_BAG.COPY_TEXT}")`).first().click()

    // 等待「复制并创建福袋」表单（慢机器上抽屉渲染可能要更久）
    const formStartedAt = Date.now()
    await page.waitForSelector(MARKETING.GIFT_BAG.FORM_READY, { timeout: 30000, state: 'visible' })
    timings.formMs = Date.now() - formStartedAt
    await sleep(800)

    // ⚠️ 提交前先记录表单里的时长（复制模板时不动它，走免审）
    const durationText = await readSelectedDuration(page)

    const submitBtn = page.locator(MARKETING.GIFT_BAG.SUBMIT).first()
    if (await submitBtn.isDisabled().catch(() => false)) {
      throw new Error('「提交审核」按钮不可用，福袋表单可能未就绪')
    }
    const submitStartedAt = Date.now()
    await submitBtn.click()

    // 边等边点二次确认；按「是否还在提交中」决定等多久（不再是固定 10 秒）
    const outcome = await waitGiftBagSubmitOutcome(page)
    timings.submitMs = Date.now() - submitStartedAt

    const durationMs = durationText ? parseDurationText(durationText) : null

    // ⚠️ 还在提交中时**绝对不能**去关抽屉复核：关掉就等于取消提交。
    // 这种情况返回「未确认」，由任务层稍后重新读列表判断，绝不在这里下失败结论
    // （误判失败会触发重发 → 重复创建福袋）。
    if (outcome === 'submitting') {
      timings.totalMs = Date.now() - startedAt
      return { durationText, durationMs, verified: false, outcome, timings }
    }

    // 表单已关闭或已空闲 → 可以安全地重开抽屉核对列表
    const verifyStartedAt = Date.now()
    const afterRows = await countGiftBagRows(page)
    timings.verifyMs = Date.now() - verifyStartedAt
    timings.totalMs = Date.now() - startedAt

    const verified = afterRows !== null && afterRows > beforeRows

    // 表单一直可用（没进入提交态）+ 列表也没新增 → 明确失败，不要谎报成功
    if (outcome === 'idle' && !verified) {
      throw new Error(
        '已点击「提交审核」，但表单一直停留在可提交状态、列表里也没出现新的福袋 —— 本次没有发放成功' +
          '（可能是表单校验未通过或被服务端拒绝）。请到中控台核对后重试',
      )
    }

    return { durationText, durationMs, verified, outcome, timings }
  } finally {
    await closeAllDrawers(page)
  }
}

// ============================ 优惠券 ============================

/** 读取「本场直播优惠券」列表（读完后自动关闭弹窗） */
export async function readCoupons(page: Page): Promise<CouponInfo[]> {
  await openMarketingTile(page, MARKETING.COUPON.TILE, MARKETING.COUPON.MODAL_READY)
  try {
    await waitForTableRows(page)
    const rows = await page.locator(MARKETING.TABLE_ROW).all()
    const result: CouponInfo[] = []

    for (const row of rows) {
      const name = await cellText(row, MARKETING.COUPON.COL_NAME)
      if (!name || name.includes('优惠券名称')) continue

      const hasSend = await row.locator(MARKETING.COUPON.SEND_BUTTON).count()
      const hasStop = await row.locator(MARKETING.COUPON.STOP_BUTTON).count()
      if (hasSend === 0 && hasStop === 0) continue

      result.push({
        index: result.length + 1,
        name,
        status: await cellText(row, MARKETING.COUPON.COL_STATUS),
        sending: hasStop > 0,
        amount: await cellText(row, MARKETING.COUPON.COL_AMOUNT),
        totalStock: await cellText(row, MARKETING.COUPON.COL_TOTAL_STOCK),
        availableStock: await cellText(row, MARKETING.COUPON.COL_AVAILABLE_STOCK),
      })
    }
    return result
  } finally {
    await closeAllDrawers(page)
  }
}

/**
 * 页面内扫描发券弹窗里所有可见的单选项，按「规模 / 时长」分类。
 *
 * 不能靠猜选项名：普通券是「1000张」，平台补贴券是「5000元」，
 * 「全部」在有些券上叫「全部库存」、有些叫「全部预算」。
 * 所以直接把页面上的文案读出来，交给界面做下拉。
 */
const COLLECT_COUPON_OPTIONS = `(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.width > 0
  }
  const texts = []
  for (const label of Array.from(document.querySelectorAll('label'))) {
    if (!label.querySelector('input[type="radio"]')) continue
    if (!visible(label)) continue
    const text = (label.innerText || label.textContent || '').replace(/\\s+/g, '')
    if (text) texts.push(text)
  }
  const scale = []
  const duration = []
  for (const text of texts) {
    // 「自定义」需要再填数字，下拉里驱动不了，直接跳过
    if (/自定义|其他/.test(text)) continue
    if (/分钟|小时|秒$/.test(text)) {
      if (!duration.includes(text)) duration.push(text)
      continue
    }
    if (/张|元|预算|库存/.test(text)) {
      if (!scale.includes(text)) scale.push(text)
    }
  }
  return { scale, duration }
})()`

/** 打开某张券的「发放优惠券」弹窗，读走里面可选的发放规模与时长 */
export async function readCouponSendOptions(
  page: Page,
  couponName: string,
): Promise<CouponSendOptions> {
  await openMarketingTile(page, MARKETING.COUPON.TILE, MARKETING.COUPON.MODAL_READY)
  try {
    await waitForTableRows(page)
    const row = page.locator('tr').filter({ hasText: couponName }).first()
    if ((await row.count()) === 0) throw new Error(`未在优惠券列表中找到「${couponName}」`)

    const sendBtn = row.locator(MARKETING.COUPON.SEND_BUTTON).first()
    const canOpen = (await sendBtn.count()) > 0 && (await sendBtn.isVisible().catch(() => false))
    if (!canOpen) throw new Error('该券正在发放中，现在读不到发放选项（等这轮发完或先停止）')

    await sendBtn.click()
    await page.waitForSelector(MARKETING.COUPON.DIALOG_READY, { timeout: 20000, state: 'visible' })
    await sleep(600)
    return (await page.evaluate(COLLECT_COUPON_OPTIONS)) as CouponSendOptions
  } finally {
    // 读选项会把弹窗打开，必须关掉，否则会挡住后续操作
    await closeAllDrawers(page)
  }
}

/**
 * 提交后复查：重新读一次优惠券列表，看目标券是否真的进入了「发放中」。
 * 读不到（列表打不开等）返回 null，调用方不要把 null 当成失败。
 */
async function isCouponSending(
  page: Page,
  couponName: string,
  timeout = 6000,
): Promise<boolean | null> {
  const deadline = Date.now() + timeout
  while (true) {
    try {
      const list = await readCoupons(page)
      const target = list.find(c => c.name === couponName)
      if (target?.sending) return true
    } catch {
      return null
    }
    if (Date.now() >= deadline) return false
    await sleep(1500)
  }
}

/** 发放优惠券 */
export async function sendCouponOnPage(page: Page, params: SendCouponParams): Promise<void> {
  await openMarketingTile(page, MARKETING.COUPON.TILE, MARKETING.COUPON.MODAL_READY)
  try {
    await waitForTableRows(page)

    const row = page.locator('tr').filter({ hasText: params.couponName }).first()
    if ((await row.count()) === 0) {
      throw new Error(`未在优惠券列表中找到「${params.couponName}」`)
    }

    // 若正在发放中：要么先停止（restop），要么直接报错
    let hasStopped = false
    const stopBtn = row.locator(MARKETING.COUPON.STOP_BUTTON).first()
    if ((await stopBtn.count()) > 0 && (await stopBtn.isVisible().catch(() => false))) {
      if (!params.restop) {
        throw new Error('该优惠券正在发放中，如需重新发放请先停止（勾选「先停止再发放」）')
      }
      await stopBtn.click()
      await sleep(800)
      await clickConfirmIfAny(page)
      hasStopped = true
      // ⚠️ 停止后行内按钮不会立即刷新，必须轮询等「发放优惠券」重新出现
      const readyAfterStop = await waitForRowButton(row, MARKETING.COUPON.SEND_BUTTON, 30000)
      if (!readyAfterStop) {
        throw new Error(
          '已停止发券，但 30 秒内未等到「发放优惠券」按钮出现，请稍后在页面上手动确认',
        )
      }
    }

    if (!hasStopped) {
      // 常规路径也给一次短等待，容忍按钮渲染稍慢
      const ready = await waitForRowButton(row, MARKETING.COUPON.SEND_BUTTON, 8000)
      if (!ready) {
        throw new Error('该优惠券当前不可发放（未找到「发放优惠券」按钮）')
      }
    }

    const sendBtn = row.locator(MARKETING.COUPON.SEND_BUTTON).first()
    await sendBtn.click()

    await page.waitForSelector(MARKETING.COUPON.DIALOG_READY, { timeout: 20000, state: 'visible' })
    await sleep(600)

    await applyCouponScale(page, params.count)
    const durationOk = await pickRadio(page, params.duration)
    if (!durationOk) throw new Error(`发券时长选项「${params.duration}」不存在`)

    // ⚠️ 点击前先确认按钮「可用」，不可用基本意味着上面的数量/时长没真正选中
    const confirmBtn = page.locator(MARKETING.COUPON.CONFIRM).first()
    if (await confirmBtn.isDisabled().catch(() => false)) {
      throw new Error('「确定发放」按钮不可用：发放数量/时长可能未成功选中，请重试')
    }
    await confirmBtn.click()

    // 边等边点二次确认，直到发券弹窗关闭（不再「点一次就赌它成功」）
    const closed = await waitCouponDialogClosed(page)
    if (!closed) {
      // 弹窗没关闭：再读一次列表，确认是不是其实已经发出去了
      const sending = await isCouponSending(page, params.couponName)
      // 只有明确读到「没在发放中」才判失败；读不到（null）不武断下结论
      if (sending === false) {
        throw new Error(
          '已点击「确定发放」，但 10 秒内弹窗没有关闭、列表里该券也没进入「发放中」——' +
            '本次大概率没有发放成功（确认弹窗未点掉或被服务端拒绝）。请到中控台核对后重试',
        )
      }
    }
  } finally {
    await closeAllDrawers(page)
  }
}
