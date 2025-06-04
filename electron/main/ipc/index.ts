import { setupAIChatIpcHandler } from './aichat'
import { setupLiveControlIpcHandlers } from './connection'

setupLiveControlIpcHandlers()
setupAIChatIpcHandler()
