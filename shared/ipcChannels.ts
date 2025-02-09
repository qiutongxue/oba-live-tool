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
      normalChat: 'tasks:aiChat:normalChat',
    },
    autoReply: {
      startCommentListener: 'tasks:autoReply:startCommentListener',
      stopCommentListener: 'tasks:autoReply:stopCommentListener',
      showComment: 'tasks:autoReply:showComment',
      startAutoReply: 'tasks:autoReply:startAutoReply',
      stopAutoReply: 'tasks:autoReply:stopAutoReply',
      replyGenerated: 'tasks:autoReply:replyGenerated',
      sendReply: 'tasks:autoReply:sendReply',
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
