window.ipcRenderer.on('main-process-message', (_event, ...args) => {
  // eslint-disable-next-line no-console
  console.log('[Receive Main-process message]:', ...args)
})
