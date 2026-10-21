export const IPC_CHANNELS = {
  tasks: {
    liveControl: {
      connect: 'tasks:liveControl:connect',
      notifyAccountName: 'tasks:liveControl:notifyAccountName',
      disconnect: 'tasks:liveControl:disconnect',
      disconnectedEvent: 'tasks:liveControl:disconnectedEvent',
    },
    autoMessage: {
      start: 'tasks:autoMessage:start',
      stop: 'tasks:autoMessage:stop',
      stoppedEvent: 'tasks:autoMessage:stoppedEvent',
      updateConfig: 'tasks:autoMessage:updateConfig',
      sendBatchMessages: 'tasks:autoMessage:sendBatchMessages',
    },
    autoPopUp: {
      start: 'tasks:autoPopUp:start',
      stop: 'tasks:autoPopUp:stop',
      updateConfig: 'tasks:autoPopUp:updateConfig',
      stoppedEvent: 'tasks:autoPopUp:stoppedEvent',
      registerShortcuts: 'tasks:autoPopup:registerShortcut',
      unregisterShortcuts: 'tasks:autoPopup:unregisterShortcut',
    },
    commentScroll: {
      start: 'tasks:commentScroll:start',
      stop: 'tasks:commentScroll:stop',
      stoppedEvent: 'tasks:commentScroll:stoppedEvent',
    },
    aiChat: {
      chat: 'tasks:aiChat:chat',
      stream: 'tasks:aiChat:stream',
      error: 'tasks:aiChat:error',
      normalChat: 'tasks:aiChat:normalChat',
      testApiKey: 'tasks:aiChat:testApiKey',
    },
    autoReply: {
      startCommentListener: 'tasks:autoReply:startCommentListener',
      stopCommentListener: 'tasks:autoReply:stopCommentListener',
      listenerStopped: 'tasks:autoReply:listenerStopped',
      showComment: 'tasks:autoReply:showComment',
      startAutoReply: 'tasks:autoReply:startAutoReply',
      stopAutoReply: 'tasks:autoReply:stopAutoReply',
      replyGenerated: 'tasks:autoReply:replyGenerated',
      sendReply: 'tasks:autoReply:sendReply',
    },
    // 视频号上墙
    pinComment: 'tasks:pinComment',
    // 一键发红包
    redPacket: {
      send: 'tasks:redPacket:send',
    },
    // 营销工具（抖音团购：福袋 / 优惠券）
    marketing: {
      getGiftBagTemplates: 'tasks:marketing:getGiftBagTemplates',
      sendGiftBag: 'tasks:marketing:sendGiftBag',
      getCoupons: 'tasks:marketing:getCoupons',
      sendCoupon: 'tasks:marketing:sendCoupon',
      startLoop: 'tasks:marketing:startLoop',
      stopLoop: 'tasks:marketing:stopLoop',
      updateLoopConfig: 'tasks:marketing:updateLoopConfig',
      loopStoppedEvent: 'tasks:marketing:loopStoppedEvent',
    },
  },
  config: {
    save: 'config:save',
    load: 'config:load',
  },
  chrome: {
    getPath: 'chrome:getPath',
    setPath: 'chrome:setPath',
    selectPath: 'chrome:selectPath',
    toggleDevTools: 'chrome:toggleDevTools',
    saveState: 'chrome:saveState',
  },
  updater: {
    checkUpdate: 'updater:checkUpdate',
    updateAvailable: 'updater:updateAvailable',
    startDownload: 'updater:startDownload',
    downloadProgress: 'updater:downloadProgress',
    updateError: 'updater:updateError',
    updateDownloaded: 'updater:updateDownloaded',
    quitAndInstall: 'updater:quitAndInstall',
  },
  account: {
    switch: 'account:switch',
  },
  log: 'log',
  app: {
    openLogFolder: 'app:openLogFolder',
    notifyUpdate: 'app:notifyUpdate',
    openExternal: 'app:openExternal',
    getProviders: 'app:getProviders',
    providersUpdated: 'app:providersUpdated',
  },
} as const
