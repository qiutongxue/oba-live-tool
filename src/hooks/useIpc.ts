import { useMemoizedFn } from 'ahooks'
import { useEffect, useRef } from 'react'

const api = window.ipcRenderer

export function useIpcListener<Channel extends Parameters<typeof api.on>[0]>(
  ...args: Parameters<typeof api.on<Channel>>
) {
  const [channel, callback] = args
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const listener = (...args: Parameters<typeof callback>) => {
      callbackRef.current(...args)
    }

    const removeListener = api.on(channel, listener)

    return () => {
      removeListener()
    }
  }, [channel])
}

// export function useIpcRenderer() {
//   const ipcInvoke = useMemoizedFn(
//     <Channel extends Parameters<typeof api.invoke>[0]>(
//       ...args: Parameters<typeof api.invoke<Channel>>
//     ) => {
//       const [channel, ...params] = args
//       return api.invoke(channel, ...params)
//     },
//   )

//   const ipcSend = useMemoizedFn(
//     <Channel extends Parameters<typeof api.send>[0]>(
//       ...args: Parameters<typeof api.send<Channel>>
//     ) => {
//       const [channel, ...params] = args
//       return api.send(channel, ...params)
//     },
//   )

//   return { ipcInvoke, ipcSend }
// }
