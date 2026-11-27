import type { Page } from 'playwright'

/**
 * 把中控台「评论管理」模块里的消息列表滚动到底部。
 *
 * 背景（2026-10-21）：eos 的评论列表偶尔会停止自动跟随新消息，
 * 画面就停在某个时间段的弹幕上，看不到最新的评论。
 *
 * ⚠️ 这里**不使用任何带哈希的类名**（如 `comment-wrap-sJwP1r`，每次前端发版都会变），
 * 定位分两步走：
 *  A. 文本定位：找到文本精确等于「评论管理」且可见的最内层元素，从它**往上逐层**扩大范围，
 *     最近一层里出现可滚动容器就采用（避免一路找到整页滚动条）；
 *  B. 兜底定位：A 失败时，扫全页找「类名里含 comment 且能滚动」的元素，取滚动范围最大的。
 *
 * 返回值带诊断信息（定位方式 / 候选数量 / 选中的容器），一旦失败可以直接从日志看出原因。
 */
export async function scrollCommentListToBottom(page: Page): Promise<CommentScrollReport> {
  return await page.evaluate((): CommentScrollReport => {
    /** 元素摘要，写进日志方便对照：类名前 40 字符 + 可视尺寸/内容高度 */
    const describe = (el: HTMLElement) => {
      const cls = typeof el.className === 'string' ? el.className : ''
      return `${cls.slice(0, 40) || '(no-class)'} ${el.clientWidth}x${el.clientHeight}/${el.scrollHeight}`
    }

    /** 判断元素自身是不是一个「内容比可视区高、且允许纵向滚动」的容器 */
    const isScrollable = (el: Element): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false
      const { overflowY } = window.getComputedStyle(el)
      if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') return false
      return el.scrollHeight - el.clientHeight > 4
    }

    /**
     * 收集 root 子树里的可滚动候选。
     * strict = 确认允许纵向滚动；loose = 仅内容超出可视区（兜底，应对自定义滚动条 / overflow:hidden）。
     */
    const collect = (root: HTMLElement): HTMLElement[] => {
      const strict: HTMLElement[] = []
      const loose: HTMLElement[] = []
      const walk = (el: HTMLElement) => {
        const gap = el.scrollHeight - el.clientHeight
        if (gap > 24) loose.push(el)
        if (gap > 4 && isScrollable(el)) strict.push(el)
        for (const child of Array.from(el.children)) {
          if (child instanceof HTMLElement) walk(child)
        }
      }
      walk(root)
      return strict.length > 0 ? strict : loose
    }

    /** 在候选里挑滚动范围最大的，滚到底 */
    const applyTo = (
      candidates: HTMLElement[],
      via: CommentScrollReport['via'],
    ): CommentScrollReport => {
      const target = candidates.reduce((a, b) =>
        b.scrollHeight - b.clientHeight > a.scrollHeight - a.clientHeight ? b : a,
      )
      const report: CommentScrollReport = {
        via,
        candidates: candidates.length,
        target: describe(target),
        status: 'scrolled',
      }
      const gap = target.scrollHeight - target.scrollTop - target.clientHeight
      if (gap <= 4) return { ...report, status: 'already-bottom' }

      target.scrollTop = target.scrollHeight
      // 部分虚拟列表要靠 scroll 事件才会继续加载
      target.dispatchEvent(new Event('scroll', { bubbles: true }))
      return report
    }

    // ==================== A. 文本定位 ====================
    const titles = Array.from(document.querySelectorAll<HTMLElement>('div, span')).filter(
      el =>
        el.childElementCount === 0 &&
        (el.textContent ?? '').trim() === '评论管理' &&
        el.offsetParent !== null,
    )
    const title = titles[0]

    if (title) {
      // 从标题往上逐层扩大范围（最多 6 层且不越过 body，避免找到整页滚动条）
      let scope: HTMLElement | null = title.parentElement
      for (
        let depth = 0;
        depth < 6 && scope && scope !== document.body && scope !== document.documentElement;
        depth++
      ) {
        const candidates = collect(scope)
        if (candidates.length > 0) return applyTo(candidates, 'text')
        scope = scope.parentElement
      }
      return { status: 'no-scrollable', via: 'text', candidates: 0, target: '' }
    }

    // ==================== B. 类名兜底（标题没找到时） ====================
    const commentEls = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el => {
      const cls = typeof el.className === 'string' ? el.className.toLowerCase() : ''
      if (!cls.includes('comment')) return false
      if (el.offsetParent === null) return false
      return el.scrollHeight - el.clientHeight > 24
    })
    const commentCandidates = commentEls.filter(isScrollable)
    const pool = commentCandidates.length > 0 ? commentCandidates : commentEls
    if (pool.length > 0) return applyTo(pool, 'class')

    return { status: 'no-title', via: 'none', candidates: 0, target: '' }
  })
}
