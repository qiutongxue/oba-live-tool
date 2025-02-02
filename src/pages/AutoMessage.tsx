import { TaskOperationButtons } from '@/components/TaskOperationButtons'
import { TaskPanel } from '@/components/TaskPanel'
import { useAutoMessage } from '@/hooks/useAutoMessage'
import { useLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import React, { useCallback, useState } from 'react'

export default function AutoMessage() {
  const { isConnected } = useLiveControl()
  const { hasChanges, saveConfig, store } = useAutoMessage()
  const { toast } = useToast()
  const [validationError, setValidationError] = useState<string | null>(null)

  const configValidator = useCallback(() => {
    if (store.config.enabled && store.config.messages.length === 0) {
      setValidationError('请至少添加一条消息')
      return false
    }
    if (store.config.messages.some(msg => msg.length > 50)) {
      setValidationError('消息长度不能超过50个字符')
      return false
    }
    setValidationError(null)
    return true
  }, [store.config.messages, store.config.enabled])

  const onStartTask = useCallback(async () => {
    if (!configValidator())
      return
    const result = await window.ipcRenderer.invoke(window.ipcChannels.tasks.autoMessage.start, store.config)
    if (result) {
      store.setIsRunning(true)
      toast.success('自动消息任务已启动')
    }
    else {
      store.setIsRunning(false)
      toast.error('自动消息任务启动失败')
    }
  }, [store, toast, configValidator])

  const onStopTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(window.ipcChannels.tasks.autoMessage.stop)
    if (result) {
      store.setIsRunning(false)
      toast.success('自动消息任务已停止')
    }
    else {
      toast.error('自动消息任务停止失败')
    }
  }, [store, toast])

  const handleMessageChange = (index: number, value: string) => {
    if (value.length > 50)
      return // 不允许输入超过50个字符

    const newMessages = [...store.config.messages]
    newMessages[index] = value
    store.setMessages(newMessages)
  }

  return (
    <div className="space-y-8">
      {validationError && (
        <div className="border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{validationError}</span>
          </div>
        </div>
      )}

      <TaskPanel
        title="自动发言配置"
        enabled={store.config.enabled}
        onEnableChange={checked => store.setEnabled(checked)}
        scheduler={store.config.scheduler}
        onSchedulerChange={interval => store.setScheduler({ interval })}
      >
        {/* 消息列表 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">消息列表</label>
          <div className="space-y-3">
            {store.config.messages.map((message, index) => (
              <div key={index} className="flex gap-3 items-center group">
                <input
                  type="text"
                  value={message}
                  onChange={e => handleMessageChange(index, e.target.value)}
                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-md transition-all ${message.length > 50
                    ? 'border-red-300 focus:border-red-300 focus:shadow-[0_0_0_1px_#FCA5A5,0_1px_2px_0_rgba(0,0,0,0.05)]'
                    : ''}`}
                />
                <div className="w-12 text-right">
                  <span className={`text-xs ${message.length > 50 ? 'text-red-500' : 'text-gray-500'}`}>
                    {message.length}
                    /50
                  </span>
                </div>
                <label className="flex items-center gap-2 min-w-[80px]">
                  <input
                    type="checkbox"
                    checked={store.config.pinTops.includes(index)}
                    onChange={(e) => {
                      const newPinTops = e.target.checked
                        ? [...store.config.pinTops, index]
                        : store.config.pinTops.filter(i => i !== index)
                      store.setPinTops(newPinTops)
                    }}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">置顶</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newMessages = store.config.messages.filter((_, i) => i !== index)
                    store.setMessages(newMessages)
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => store.setMessages([...store.config.messages, ''])}
              className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              添加消息
            </button>
          </div>
        </div>

        {/* 随机发送 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={store.config.random}
            onChange={e => store.setRandom(e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">随机发送</span>
        </label>
      </TaskPanel>

      <TaskOperationButtons
        validationError={validationError}
        hasChanges={hasChanges}
        isConnected={isConnected}
        isTaskRunning={store.isRunning}
        onSave={saveConfig}
        onStartStop={store.isRunning ? onStopTask : onStartTask}
      />
    </div>
  )
}
