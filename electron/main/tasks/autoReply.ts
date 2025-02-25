import { ipcMain } from 'electron'
import type { Page } from 'playwright'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { COMMENT_LIST_WRAPPER } from '#/constants'
import { createLogger } from '#/logger'
import type { Account } from '#/taskManager'
import { pageManager } from '#/taskManager'
import windowManager from '#/windowManager'
import { LiveController } from './Controller'

const TASK_NAME = '监听评论'
const logger = createLogger(TASK_NAME)

declare global {
  interface Window {
    parseComment: (commentNode: HTMLElement) => CommentData | null
    handleNewComment: (commentData: CommentData) => void
    cleanupAutoReply: () => void
  }
}

interface CommentData {
  id: string
  nickname: string | undefined
  authorTags: (string | undefined)[]
  commentTags: (string | undefined)[]
  content: string
  timestamp: string
}

class CommentManager {
  private controller: LiveController
  public isRunning = false
  private handlerInitialized = false
  private intervalTimer: NodeJS.Timeout | null = null

  constructor(
    private readonly page: Page,
    private account: Account,
  ) {
    if (!page) throw new Error('Page not initialized')
    this.controller = new LiveController(page)
  }

  private async setupCommentHandler() {
    if (this.handlerInitialized) return

    try {
      await this.page.exposeFunction(
        'handleNewComment',
        (comment: CommentData) => {
          logger.info(`【新评论】<${comment.nickname}>: ${comment.content}`)
          windowManager.sendToWindow(
            'main',
            IPC_CHANNELS.tasks.autoReply.showComment,
            { comment, accountId: this.account.id },
          )
        },
      )
      this.handlerInitialized = true
    } catch (error) {
      // 如果函数已经存在，忽略错误
      if (
        error instanceof Error &&
        !error.message.includes('has been already registered')
      )
        throw error
    }
  }

  private async processExistingComments() {
    await this.page.evaluate(() => {
      const commentNodes = document.querySelectorAll(
        '#comment-list-wrapper [class^="commentItem"]',
      )
      for (const node of commentNodes) {
        const commentData = window.parseComment(node as HTMLElement)
        if (commentData) window.handleNewComment(commentData)
      }
    })
  }

  private async setupCommentObserver() {
    await this.page.evaluate(() => {
      let observer: MutationObserver | null = null
      let clickTimer: number | null = null

      function parseComment(commentNode: HTMLElement): CommentData | null {
        const nicknameContainer = commentNode.querySelector(
          '[class^="nickname"]',
        )
        if (!nicknameContainer) return null

        // 克隆节点避免影响原始 DOM
        const clone = nicknameContainer.cloneNode(true) as Element

        // 提取作者类型标签（主播/自动回复）
        const authorTags = Array.from(
          clone.querySelectorAll('[class^="authorTag"]'),
        ).map(tag => {
          tag.remove()
          return tag.textContent?.trim()
        })

        // 提取评论类型标签（问询/粉丝）
        const commentTags = Array.from(
          clone.querySelectorAll('[class^="commentTag"]'),
        ).map(tag => {
          tag.remove()
          return tag.textContent?.trim()
        })

        // 清理后的昵称文本
        const nickname = clone.textContent
          ?.replace(/\s+/g, ' ')
          .replace(/：$/, '')
          .trim()

        // 提取评论内容
        const content =
          commentNode
            .querySelector('[class^="description"]')
            ?.textContent?.trim()
            .replace(/\s+/g, ' ') || ''

        return {
          id: crypto.randomUUID(),
          nickname,
          authorTags,
          commentTags,
          content,
          timestamp: new Date().toISOString(),
        }
      }
      // 将 parseComment 函数挂载到 window 上，以便处理已存在的评论
      window.parseComment = parseComment

      function setupMutationObserver() {
        observer = new MutationObserver(mutations => {
          for (const { addedNodes } of mutations) {
            for (const _node of addedNodes) {
              const node = _node as HTMLElement
              if (node.className.includes('commentItem')) {
                const commentData = parseComment(node)
                if (commentData) window.handleNewComment(commentData)
              }
            }
          }
        })

        const commentList = document.querySelector('#comment-list-wrapper')
        if (commentList) {
          observer.observe(commentList, { childList: true })
        }
      }

      function setupNewCommentChecker() {
        function clickNewCommentButton() {
          const newCommentButton = document.querySelector(
            '[class^="newCommentLabel"]',
          ) as HTMLDivElement
          if (newCommentButton) newCommentButton.click()
          clickTimer = window.setTimeout(clickNewCommentButton, 3000)
        }

        clickNewCommentButton()
      }

      // 初始化观察者和定时器
      setupMutationObserver()
      setupNewCommentChecker()

      // 清理函数
      window.cleanupAutoReply = () => {
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
    if (this.isRunning) {
      logger.warn('评论监听已在运行中')
      return
    }
    // 立即设置为 true，如果在 start 完成时再设置，下面异步任务执行的过程中有可能会被再次调用 start，导致执行两遍
    this.isRunning = true

    try {
      const commentListWrapper = await this.page.$(COMMENT_LIST_WRAPPER)
      if (!commentListWrapper) {
        throw new Error('未找到直播互动内容，可能未开播')
      }

      // 在启动时设置处理函数
      await this.setupCommentHandler()
      await this.setupCommentObserver()

      // 处理已存在的评论
      await this.processExistingComments()

      // 5分钟检查一次是否弹出了保护窗口
      this.intervalTimer = setInterval(
        () => {
          this.controller.recoveryLive()
        },
        5 * 60 * 1000,
      )

      logger.success('评论监听启动成功')
    } catch (error) {
      // 确保出错时状态正确
      this.isRunning = false
      throw error
    }
  }

  public async stop() {
    if (!this.isRunning) {
      logger.warn('评论监听已经停止')
      return
    }

    try {
      // 调用页面中的清理函数
      // await this.page.evaluate(() => {
      //   if ((window as any).cleanupAutoReply) {
      //     (window as any).cleanupAutoReply()
      //     delete (window as any).cleanupAutoReply
      //     delete (window as any).parseComment
      //   }
      // })
      this.intervalTimer && clearInterval(this.intervalTimer)
      this.isRunning = false
      windowManager.sendToWindow(
        'main',
        IPC_CHANNELS.tasks.autoReply.stopCommentListener,
      )
      logger.success('评论监听已停止')
    } catch (error) {
      logger.error(
        '停止评论监听失败:',
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  }

  // 为了保持与其他任务管理器接口一致
  public updateConfig() {}
}

// IPC 处理程序
function setupIpcHandlers() {
  ipcMain.handle(
    IPC_CHANNELS.tasks.autoReply.startCommentListener,
    async () => {
      try {
        if (!pageManager.contains(TASK_NAME)) {
          logger.debug('注册监听评论任务')
          pageManager.register(
            TASK_NAME,
            (page, account) => new CommentManager(page, account),
          )
        }

        await pageManager.startTask(TASK_NAME)
        return true
      } catch (error) {
        logger.error(
          '启动评论监听失败:',
          error instanceof Error ? error.message : String(error),
        )
        return false
      }
    },
  )

  ipcMain.handle(IPC_CHANNELS.tasks.autoReply.stopCommentListener, async () => {
    try {
      pageManager.stopTask(TASK_NAME)
      return true
    } catch (error) {
      logger.error(
        '停止监听评论失败:',
        error instanceof Error ? error.message : String(error),
      )
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.tasks.autoReply.sendReply, async (_, message) => {
    try {
      const page = pageManager.getPage()
      const controller = new LiveController(page)
      await controller.sendMessage(message)
    } catch (error) {
      logger.error(
        '发送回复失败:',
        error instanceof Error ? error.message : String(error),
      )
      throw error
    }
  })
}

setupIpcHandlers()
