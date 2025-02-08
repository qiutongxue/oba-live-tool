import type { Page } from 'playwright'
import { COMMENT_LIST_WRAPPER } from '#/constants'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import windowManager from '#/windowManager'
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from 'shared/ipcChannels'

const logger = createLogger('自动回复')

;(() => {
  ipcMain.handle(IPC_CHANNELS.tasks.autoReply.start, async () => {
    pageManager.register('autoReply', createAutoReply)
    pageManager.startTask('autoReply')
    return true
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoReply.stop, async () => {
    pageManager.stopTask('autoReply')
    return true
  })
})()

function createAutoReply(page: Page) {
  let isRunning = false

  page.exposeFunction('handleNewComment', (comment: string) => {
    windowManager.sendToWindow('main', IPC_CHANNELS.tasks.autoReply.showComment, comment)
  })

  const start = async () => {
    const commentListWrapper = await page.$(COMMENT_LIST_WRAPPER)
    if (!commentListWrapper) {
      logger.error('未找到直播互动内容，可能未开播')
      return
    }

    isRunning = true

    page.evaluate(() => {
      let observer: MutationObserver | null = null
      let clickTimer: number | null = null

      const parseComment = (commentNode: HTMLElement) => {
        const nicknameContainer = commentNode.querySelector('[class^="nickname"]')
        if (!nicknameContainer)
          return null

        // 克隆节点避免影响原始 DOM
        const clone = nicknameContainer.cloneNode(true) as Element

        // 提取作者类型标签（主播/自动回复）
        const authorTags = Array.from(clone.querySelectorAll('[class^="authorTag"]'))
          .map((tag) => {
            tag.remove()
            return tag.textContent?.trim()
          })

        // 提取评论类型标签（问询/粉丝）
        const commentTags = Array.from(clone.querySelectorAll('[class^="commentTag"]'))
          .map((tag) => {
            tag.remove()
            return tag.textContent?.trim()
          })

        // 清理后的昵称文本
        const nickname = clone.textContent?.replace(/\s+/g, ' ')
          .replace(/：$/, '')
          .trim()

        // 提取评论内容
        const content = commentNode.querySelector('[class^="description"]')?.textContent?.trim().replace(/\s+/g, ' ') || ''

        return {
          nickname,
          authorTags,
          commentTags,
          content,
          timestamp: new Date().toISOString(),
        }
      }

      observer = new MutationObserver((mutations) => {
        mutations.forEach(({ addedNodes }) => {
          addedNodes.forEach((_node) => {
            const node = _node as HTMLElement
            if (node.classList?.contains('commentItem')) {
              const commentData = parseComment(node)
              if (commentData)
                (window as any).handleNewComment(commentData)
            }
          })
        })
      })

      // observer 在停止时需要手动停止
      observer.observe(
        document.querySelector(COMMENT_LIST_WRAPPER) as Node,
        { childList: true },
      )

      // 有新消息时互动区不会新增消息，需要点击按钮刷新
      function clickNewCommentButton() {
        const newCommentButton = document.querySelector('[class^="newCommentLabel"]') as HTMLDivElement
        if (newCommentButton)
          newCommentButton.click()
        clickTimer = window.setTimeout(clickNewCommentButton, 3000)
      }

      clickNewCommentButton()

      // 将清理函数挂载到 window 上，以便在停止时调用
      ;(window as any).cleanupAutoReply = () => {
        if (observer) {
          observer.disconnect()
          observer = null
        }
        if (clickTimer) {
          window.clearTimeout(clickTimer)
          clickTimer = null
        }
      }
    })
  }

  const stop = async () => {
    if (!isRunning)
      return

    // 调用页面中的清理函数
    await page.evaluate(() => {
      if ((window as any).cleanupAutoReply) {
        (window as any).cleanupAutoReply()
        delete (window as any).cleanupAutoReply
      }
    })

    isRunning = false
    logger.info('自动回复已停止')
  }

  return {
    start,
    stop,
    isRunning: false,
    updateConfig() {},
  }
}
