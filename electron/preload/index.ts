import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron'
import type { ElectronAPI, IpcChannels } from 'shared/electron-api'

type IpcRendererInvokeReturnType<Channel extends keyof IpcChannels> =
  ReturnType<IpcChannels[Channel]> extends Promise<infer _U>
    ? ReturnType<IpcChannels[Channel]>
    : Promise<ReturnType<IpcChannels[Channel]>>

const ipcRendererApi: ElectronAPI['ipcRenderer'] = {
  on<Channel extends keyof IpcChannels>(
    channel: Channel,
    listener: (...args: Parameters<IpcChannels[Channel]>) => void,
  ): () => void {
    const subscription = (
      _event: IpcRendererEvent,
      ...args: Parameters<IpcChannels[Channel]>
    ) => listener(...args)

    ipcRenderer.on(channel as string, subscription)
    return () => {
      ipcRenderer.off(channel as string, subscription)
    }
  },

  send: <Channel extends keyof IpcChannels>(
    channel: Channel,
    ...args: Parameters<IpcChannels[Channel]>
  ): void => {
    ipcRenderer.send(channel as string, ...args) // <--- 也在这里加上断言
  },

  invoke: <Channel extends keyof IpcChannels>(
    channel: Channel,
    ...args: Parameters<IpcChannels[Channel]>
  ): IpcRendererInvokeReturnType<Channel> => {
    return ipcRenderer.invoke(
      channel as string,
      ...args,
    ) as IpcRendererInvokeReturnType<Channel>
  },
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', ipcRendererApi)

// --------- Preload scripts loading ---------
function domReady(
  condition: DocumentReadyState[] = ['complete', 'interactive'],
) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = 'loaders-css__square-spin'
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

// biome-ignore lint/correctness/useHookAtTopLevel: 这不是 hook
const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = ev => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
