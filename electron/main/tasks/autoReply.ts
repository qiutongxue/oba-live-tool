import type { Page } from 'playwright'
import { COMMENT_LIST_WRAPPER } from '#/constants'
import { createLogger } from '#/logger'
import { pageManager } from '#/taskManager'
import windowManager from '#/windowManager'
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from 'shared/ipcChannels'

const TASK_NAME = '自动回复'
const logger = createLogger(TASK_NAME)

interface CommentData {
  nickname: string | undefined
  authorTags: (string | undefined)[]
  commentTags: (string | undefined)[]
  content: string
  timestamp: string
}

class CommentManager {
  private readonly page: Page
  public isRunning = false
  private handlerInitialized = false

  constructor(page: Page) {
    if (!page)
      throw new Error('Page not initialized')
    this.page = page
  }

  private async setupCommentHandler() {
    if (this.handlerInitialized)
      return

    try {
      await this.page.exposeFunction('handleNewComment', (comment: CommentData) => {
        logger.info(`【新评论】<${comment.nickname}>: ${comment.content}`)
        windowManager.sendToWindow('main', IPC_CHANNELS.tasks.autoReply.showComment, comment)
      })
      this.handlerInitialized = true
    }
    catch (error) {
      // 如果函数已经存在，忽略错误
      if (error instanceof Error && !error.message.includes('has been already registered'))
        throw error
    }
  }

  private async processExistingComments() {
    await this.page.evaluate(() => {
      const commentNodes = document.querySelectorAll('#comment-list-wrapper [class^="commentItem"]')
      commentNodes.forEach((node) => {
        const commentData = (window as any).parseComment(node as HTMLElement)
        if (commentData)
          (window as any).handleNewComment(commentData)
      })
    })
  }

  private async setupCommentObserver() {
    await this.page.evaluate(() => {
      let observer: MutationObserver | null = null
      let clickTimer: number | null = null

      function parseComment(commentNode: HTMLElement): CommentData | null {
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
        const content = commentNode.querySelector('[class^="description"]')
          ?.textContent
          ?.trim()
          .replace(/\s+/g, ' ') || ''

        return {
          nickname,
          authorTags,
          commentTags,
          content,
          timestamp: new Date().toISOString(),
        }
      }

      // 将 parseComment 函数挂载到 window 上，以便处理已存在的评论
      ;(window as any).parseComment = parseComment

      function setupMutationObserver() {
        observer = new MutationObserver((mutations) => {
          mutations.forEach(({ addedNodes }) => {
            addedNodes.forEach((_node) => {
              const node = _node as HTMLElement
              if (node.className.includes('commentItem')) {
                const commentData = parseComment(node)
                if (commentData)
                  (window as any).handleNewComment(commentData)
              }
            })
          })
        })

        const commentList = document.querySelector('#comment-list-wrapper')
        if (commentList) {
          observer.observe(commentList, { childList: true })
        }
      }

      function setupNewCommentChecker() {
        function clickNewCommentButton() {
          const newCommentButton = document.querySelector('[class^="newCommentLabel"]') as HTMLDivElement
          if (newCommentButton)
            newCommentButton.click()
          clickTimer = window.setTimeout(clickNewCommentButton, 3000)
        }

        clickNewCommentButton()
      }

      // 初始化观察者和定时器
      setupMutationObserver()
      setupNewCommentChecker()

      // 清理函数
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

  public async start() {
    if (this.isRunning)
      return

    const commentListWrapper = await this.page.$(COMMENT_LIST_WRAPPER)
    if (!commentListWrapper) {
      logger.error('未找到直播互动内容，可能未开播')
      return
    }

    // 在启动时设置处理函数
    await this.setupCommentHandler()
    await this.setupCommentObserver()

    // 处理已存在的评论
    await this.processExistingComments()

    this.isRunning = true
  }

  public async stop() {
    if (!this.isRunning)
      return

    // 调用页面中的清理函数
    await this.page.evaluate(() => {
      if ((window as any).cleanupAutoReply) {
        (window as any).cleanupAutoReply()
        delete (window as any).cleanupAutoReply
      }
    })

    this.isRunning = false
    logger.info('自动回复已停止')
  }

  public get running() {
    return this.isRunning
  }

  // 为了保持与其他任务管理器接口一致
  public updateConfig() {}
}

// IPC 处理程序
function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.tasks.autoReply.start, async () => {
    try {
      if (!pageManager.contains('autoReply'))
        pageManager.register('autoReply', page => new CommentManager(page))

      pageManager.startTask('autoReply')
      return true
    }
    catch (error) {
      logger.error('启动自动回复失败:', error instanceof Error ? error.message : error)
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoReply.stop, async () => {
    pageManager.stopTask('autoReply')
    return true
  })
}

setupIpcHandlers()

export function createAutoReply(page: Page) {
  return new CommentManager(page)
}
