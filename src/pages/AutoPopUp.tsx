import { TaskOperationButtons } from '@/components/TaskOperationButtons'
import { TaskPanel } from '@/components/TaskPanel'
import { useAutoPopUp } from '@/hooks/useAutoPopUp'
import { useLiveControl } from '@/hooks/useLiveControl'
import { useTaskConfig } from '@/hooks/useTaskConfig'
import { useToast } from '@/hooks/useToast'
import React, { useCallback, useState } from 'react'

export default function AutoPopUp() {
  const { config, setConfig, saveConfig, hasChanges } = useTaskConfig()
  const { isConnected } = useLiveControl()
  const { isAutoPopUpRunning, setAutoPopUpRunning } = useAutoPopUp()
  const [validationError, setValidationError] = useState<string | null>(null)
  const { toast } = useToast()

  const configValidator = useCallback(() => {
    if (config.autoPopUp.enabled && config.autoPopUp.goodsIds.length === 0) {
      setValidationError('请至少添加一个商品ID')
      return false
    }
    const uniqueGoodsIds = new Set(config.autoPopUp.goodsIds)
    if (uniqueGoodsIds.size !== config.autoPopUp.goodsIds.length) {
      setValidationError('商品ID不能重复！')
      return false
    }
    setValidationError(null)
    return true
  }, [config.autoPopUp.goodsIds, config.autoPopUp.enabled])

  const onStartTask = useCallback(async () => {
    if (!configValidator())
      return
    const result = await window.ipcRenderer.invoke(window.ipcChannels.tasks.autoPopUp.start, config.autoPopUp)
    if (result) {
      setAutoPopUpRunning(true)
      toast.success('自动弹窗任务已启动')
    }
    else {
      setAutoPopUpRunning(false)
      toast.error('自动弹窗任务启动失败')
    }
  }, [config.autoPopUp, setAutoPopUpRunning, toast, configValidator])

  const onStopTask = useCallback(async () => {
    const result = await window.ipcRenderer.invoke(window.ipcChannels.tasks.autoPopUp.stop)
    if (result) {
      setAutoPopUpRunning(false)
      toast.success('自动弹窗任务已停止')
    }
    else {
      toast.error('自动弹窗任务停止失败')
    }
  }, [setAutoPopUpRunning, toast])

  const handleGoodsIdChange = (index: number, value: string) => {
    const numValue = Number(value)
    if (Number.isNaN(numValue) || numValue < 1) {
      setValidationError('请输入有效的商品ID')
      return
    }
    const newIds = [...config.autoPopUp.goodsIds]
    if (newIds.includes(numValue)) {
      setValidationError('商品ID不能重复！')
      return
    }
    newIds[index] = numValue

    setValidationError(null)
    setConfig(prev => ({
      ...prev,
      autoPopUp: { ...prev.autoPopUp, goodsIds: newIds },
    }))
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
        title="自动弹窗配置"
        enabled={config.autoPopUp.enabled}
        onEnableChange={checked => setConfig(prev => ({
          ...prev,
          autoPopUp: { ...prev.autoPopUp, enabled: checked },
        }))}
        scheduler={config.autoPopUp.scheduler}
        onSchedulerChange={interval => setConfig(prev => ({
          ...prev,
          autoPopUp: {
            ...prev.autoPopUp,
            scheduler: { ...prev.autoPopUp.scheduler, interval },
          },
        }))}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">商品ID列表</label>
          <div className="space-y-3">
            {config.autoPopUp.goodsIds.map((id, index) => (
              <div key={index} className="flex gap-3 items-center group">
                <input
                  type="number"
                  value={id}
                  onChange={e => handleGoodsIdChange(index, e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                  min="1"
                  placeholder="输入商品ID"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newGoodsIds = config.autoPopUp.goodsIds.filter((_, i) => i !== index)
                    setConfig(prev => ({
                      ...prev,
                      autoPopUp: { ...prev.autoPopUp, goodsIds: newGoodsIds },
                    }))
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
              onClick={() => setConfig(prev => ({
                ...prev,
                autoPopUp: {
                  ...prev.autoPopUp,
                  goodsIds: [...prev.autoPopUp.goodsIds, 1],
                },
              }))}
              className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              添加商品
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoPopUp.random}
            onChange={e => setConfig(prev => ({
              ...prev,
              autoPopUp: { ...prev.autoPopUp, random: e.target.checked },
            }))}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">随机弹窗</span>
        </label>
      </TaskPanel>

      <TaskOperationButtons
        validationError={validationError}
        hasChanges={hasChanges}
        isConnected={isConnected}
        isTaskRunning={isAutoPopUpRunning}
        onSave={saveConfig}
        onStartStop={isAutoPopUpRunning ? onStopTask : onStartTask}
      />

    </div>
  )
}
