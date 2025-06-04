import { IPC_CHANNELS } from 'shared/ipcChannels'
import { AIChatService } from '#/services/AIChatServices'
import { typedIpcMainHandle } from '#/utils'
import windowManager from '#/windowManager'

function setupIpcHandlers() {
  typedIpcMainHandle(
    IPC_CHANNELS.tasks.aiChat.chat,
    async (_, { messages, apiKey, provider, model, customBaseURL }) => {
      try {
        const aiService = AIChatService.createService(
          apiKey,
          provider,
          customBaseURL,
        )
        for await (const { content, reasoning } of aiService.chatStream(
          messages,
          model,
        )) {
          if (content) {
            windowManager.send(IPC_CHANNELS.tasks.aiChat.stream, {
              chunk: content,
              type: 'content',
            })
          }
          if (reasoning) {
            windowManager.send(IPC_CHANNELS.tasks.aiChat.stream, {
              chunk: reasoning,
              type: 'reasoning',
            })
          }
        }
        windowManager.send(IPC_CHANNELS.tasks.aiChat.stream, {
          done: true,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        windowManager.send(IPC_CHANNELS.tasks.aiChat.error, {
          error: errorMessage,
        })
      }
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.aiChat.normalChat,
    async (_, { messages, apiKey, provider, model, customBaseURL }) => {
      try {
        const aiService = AIChatService.createService(
          apiKey,
          provider,
          customBaseURL,
        )
        const output = await aiService.chat(messages, model)
        return output
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        windowManager.send(IPC_CHANNELS.tasks.aiChat.error, {
          error: errorMessage,
        })
      }
      return null
    },
  )

  typedIpcMainHandle(
    IPC_CHANNELS.tasks.aiChat.testApiKey,
    async (_, { apiKey, provider, customBaseURL }) => {
      try {
        const aiService = AIChatService.createService(
          apiKey,
          provider,
          customBaseURL,
        )
        await aiService.checkAPIKey()
        return {
          success: true,
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          success: false,
          error: errorMessage,
        }
      }
    },
  )
}

export function setupAIChatIpcHandler() {
  setupIpcHandlers()
}
