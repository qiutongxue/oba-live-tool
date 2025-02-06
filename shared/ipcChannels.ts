export const IPC_CHANNELS = {
  tasks: {
    liveControl: {
      connect: 'tasks:liveControl:connect',
      disconnect: 'tasks:liveControl:disconnect',
    },
    autoMessage: {
      start: 'tasks:autoMessage:start',
      stop: 'tasks:autoMessage:stop',
    },
    autoPopUp: {
      start: 'tasks:autoPopUp:start',
      stop: 'tasks:autoPopUp:stop',
    },
    aiChat: {
      chat: 'tasks:aiChat:chat',
      stream: 'tasks:aiChat:stream',
      error: 'tasks:aiChat:error',
    },
  },
  config: {
    save: 'config:save',
    load: 'config:load',
  },
  getChromePath: 'chromePath:get',
  setChromePath: 'chromePath:set',
  selectChromePath: 'chromePath:select',
  toggleDevTools: 'toggle-dev-tools',
} as const
