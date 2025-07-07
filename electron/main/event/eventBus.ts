import { createLogger } from '#/logger'
import type { MainEvents } from './eventTypes'

type EventMap = MainEvents
type EventKey = keyof EventMap
type EventPayload<K extends EventKey> = EventMap[K]
type Handler<K extends EventKey> = (payload: EventPayload<K>) => void

// biome-ignore lint/suspicious/noExplicitAny: 我不用 any 用什么啊你告诉我
const listeners: Map<EventKey, Handler<any>[]> = new Map()
const logger = createLogger('EventBus')

export const emitter = {
  on: <K extends EventKey>(event: K, handler: Handler<K>) => {
    logger.debug('监听事件', event)
    if (!listeners.has(event)) {
      listeners.set(event, [])
    }
    listeners.get(event)?.push(handler)
  },

  emit: <K extends EventKey>(event: K, payload: EventPayload<K>) => {
    logger.debug('触发事件', event)
    for (const listener of listeners.get(event) ?? []) {
      listener(payload)
    }
  },

  removeAllListeners: <K extends EventKey>(event: K) => {
    listeners.delete(event)
  },
}
