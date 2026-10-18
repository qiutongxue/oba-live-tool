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
 * 点击「提交审核」后等待**表单抽屉关闭**，期间反复点掉二次确认弹窗。
 *
 * ⚠️ 2026-10-18 定位到的偶发失败根因：
 * 原来的实现是「点提交 → sleep 1.5s → 点一次确认 → sleep 1.5s → 直接返回成功」。
 * 二次确认弹窗（确定/取消）有时要好几秒才渲染出来，一次没点中就会漏掉；
 * 随后 `closeAllDrawers` 把还开着的确认弹窗关掉 —— **等于替用户点了取消**，
 * 但函数照样返回成功。表现就是「提示已发放、实际一个福袋都没创建」，且概率性发生。
 *
 * 现在改成边等边点：只要确认弹窗出现就点掉（最多 3 次，防止误触），
 * 直到表单抽屉消失或超时。
 *
 * @returns true = 表单已关闭；false = 超时仍未关闭
 */
async function waitGiftBagFormClosed(page: Page, timeout = 10000): Promise<boolean> {
  const deadline = Date.now() + timeout
  // 先给 loading 状态出现的时间
  await sleep(1000)
  let confirmClicks = 0

  while (Date.now() < deadline) {
    if (confirmClicks < 3 && (await clickConfirmIfAny(page, 2000))) {
      confirmClicks += 1
      await sleep(600)
      continue
    }

    const submit = page.locator(MARKETING.GIFT_BAG.SUBMIT)
    const n = await submit.count().catch(() => 0)
    if (n === 0) return true
    if (
      !(await submit
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      return true
    }
    await sleep(400)
  }
  return false
}

/**
 * 重新打开福袋弹窗，数一下当前列表有多少数据行；读不到返回 null。
 * 用于提交后校验「列表里是否真的多了一条」。
 */
async function countGiftBagRows(page: Page): Promise<number | null> {
  try {
    await closeAllDrawers(page)
    await openMarketingTile(page, MARKETING.GIFT_BAG.TILE, MARKETING.GIFT_BAG.MODAL_READY)
    await waitForTableRows(page, 10000)
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
  await openMarketingTile(page, MARKETING.GIFT_BAG.TILE, MARKETING.GIFT_BAG.MODAL_READY)
  try {
    await waitForTableRows(page)

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

    // 等待「复制并创建福袋」表单
    await page.waitForSelector(MARKETING.GIFT_BAG.FORM_READY, { timeout: 20000, state: 'visible' })
    await sleep(800)

    // ⚠️ 提交前先记录表单里的时长（复制模板时不动它，走免审）
    const durationText = await readSelectedDuration(page)

    const submitBtn = page.locator(MARKETING.GIFT_BAG.SUBMIT).first()
    if (await submitBtn.isDisabled().catch(() => false)) {
      throw new Error('「提交审核」按钮不可用，福袋表单可能未就绪')
    }
    await submitBtn.click()

    // 边等边点二次确认，直到表单关闭（不再是「点一次就赌它成功」）
    const formClosed = await waitGiftBagFormClosed(page)

    // 重新读一次列表，确认是否真的多了一条福袋
    const afterRows = await countGiftBagRows(page)
    const verified = afterRows !== null && afterRows > beforeRows

    // 表单没关 + 列表也没新增 → 基本可以确定这次没发出去，明确报错，不要谎报成功
    if (!formClosed && !verified) {
      throw new Error(
        '已点击「提交审核」，但 10 秒内表单没有关闭、列表里也没出现新的福袋 —— 本次大概率没有发放成功' +
          '（表单校验未通过、被服务端拒绝或确认弹窗未点掉）。请到中控台核对后重试',
      )
    }

    return {
      durationText,
      durationMs: durationText ? parseDurationText(durationText) : null,
      verified,
    }
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

    const countOk = await pickRadio(page, params.count)
    if (!countOk) throw new Error(`发券数量选项「${params.count}」不存在`)
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
