import React, { useEffect, useState } from 'react'
import Toast from './Toast'

interface TaskConfig {
  autoMessage: {
    enabled: boolean
    interval: [number, number] // [最小间隔, 最大间隔]
    messages: string[]
    pinTops: number[] // 需要置顶的消息索引
    random: boolean
  }
  autoPopUp: {
    enabled: boolean
    interval: [number, number]
    goodsIds: number[]
    random: boolean
  }
}

interface TaskConfigPanelProps {
  activeTab: string
}

function EnableSwitch({ enabled, onChange }: { enabled: boolean, onChange: (checked: boolean) => void }) {
  return (
    <label
      className="flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-colors cursor-pointer hover:bg-gray-50"
      style={{ borderColor: enabled ? '#10B981' : '#E5E7EB' }}
    >
      <div className="flex items-center gap-2">
        <svg
          className={`w-5 h-5 transition-colors ${enabled ? 'text-green-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span className={`font-medium ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
          {enabled ? '功能启用' : '功能关闭'}
        </span>
      </div>
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-0 rounded-full peer dark:bg-gray-700
          peer-checked:after:translate-x-[20px] peer-checked:bg-green-500
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:border-gray-300 after:border after:rounded-full
          after:h-5 after:w-5 after:transition-all"
        />
      </div>
    </label>
  )
}

export default function TaskConfigPanel({ activeTab }: TaskConfigPanelProps) {
  const [config, setConfig] = useState<TaskConfig>({
    autoMessage: {
      enabled: false,
      interval: [30000, 60000], // 默认 30-60 秒
      messages: [],
      pinTops: [],
      random: true,
    },
    autoPopUp: {
      enabled: false,
      interval: [30000, 45000], // 默认 30-45 秒
      goodsIds: [],
      random: true,
    },
  })

  // 添加一个状态来存储原始配置
  const [originalConfig, setOriginalConfig] = useState<TaskConfig | null>(null)
  // 添加错误状态
  const [validationError, setValidationError] = useState<string | null>(null)
  // 添加成功提示状态
  //   const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  // 检查配置是否发生变化
  const hasChanges = (): boolean => {
    if (!originalConfig)
      return false
    return JSON.stringify(config) !== JSON.stringify(originalConfig)
  }

  // 验证配置
  const validateConfig = () => {
    // 过滤空消息，并更新配置
    const filteredMessages = config.autoMessage.messages.filter(msg => msg.trim() !== '')
    if (filteredMessages.length !== config.autoMessage.messages.length) {
      setConfig(prev => ({
        ...prev,
        autoMessage: {
          ...prev.autoMessage,
          messages: filteredMessages,
          pinTops: prev.autoMessage.pinTops
            .filter(index => index < filteredMessages.length)
            .map((index) => {
              const message = prev.autoMessage.messages[index]
              return filteredMessages.indexOf(message)
            }),
        },
      }))
    }

    // 验证消息长度
    const invalidMessages = filteredMessages.filter(msg => msg.length > 50)
    if (invalidMessages.length > 0) {
      setValidationError('消息长度不能超过50个字符！')
      return false
    }

    // 验证商品ID是否重复
    const uniqueGoodsIds = new Set(config.autoPopUp.goodsIds)
    if (uniqueGoodsIds.size !== config.autoPopUp.goodsIds.length) {
      setValidationError('商品ID不能重复！')
      return false
    }

    setValidationError(null)
    return true
  }

  // 从本地加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await window.ipcRenderer.invoke('load-task-config')
        if (savedConfig) {
          setConfig(savedConfig)
          setOriginalConfig(savedConfig) // 保存原始配置
        }
      }
      catch (error) {
        console.error('加载配置失败:', error)
      }
    }
    loadConfig()
  }, [])

  // 保存配置到本地
  const saveConfig = async () => {
    if (!validateConfig() || !hasChanges())
      return

    try {
      await window.ipcRenderer.invoke('save-task-config', config)
      setOriginalConfig(config) // 更新原始配置
      setToast({ message: '配置保存成功', type: 'success' })
    }
    catch (error) {
      console.error('保存配置失败:', error)
      setToast({ message: '保存配置失败', type: 'error' })
    }
  }

  // 开始任务
  const startTask = async () => {
    if (!validateConfig())
      return

    try {
      await window.ipcRenderer.invoke('start', config)
    }
    catch (error) {
      console.error('启动任务失败:', error)
    }
  }

  // 修改消息列表验证
  const handleMessageChange = (index: number, value: string) => {
    if (value.length > 50)
      return // 不允许输入超过50个字符

    const newMessages = [...config.autoMessage.messages]
    newMessages[index] = value
    setConfig(prev => ({
      ...prev,
      autoMessage: { ...prev.autoMessage, messages: newMessages },
    }))
  }

  // 修改商品ID验证
  const handleGoodsIdChange = (index: number, value: number) => {
    const newIds = [...config.autoPopUp.goodsIds]
    newIds[index] = value

    // 检查是否有重复，但允许修改当前输入
    const otherIds = newIds.filter((_, i) => i !== index)
    if (otherIds.includes(value)) {
      setValidationError('商品ID不能重复！')
      return
    }

    setValidationError(null)
    setConfig(prev => ({
      ...prev,
      autoPopUp: { ...prev.autoPopUp, goodsIds: newIds },
    }))
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'autoMessage':
        return (
          <div className="border rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-800">自动发言配置</h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    config.autoMessage.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                  >
                    {config.autoMessage.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
                <EnableSwitch
                  enabled={config.autoMessage.enabled}
                  onChange={checked => setConfig(prev => ({
                    ...prev,
                    autoMessage: { ...prev.autoMessage, enabled: checked },
                  }))}
                />
              </div>

              <div className="space-y-6">
                {/* 间隔配置 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">发送间隔 (秒)</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="number"
                      value={config.autoMessage.interval[0] / 1000}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        autoMessage: {
                          ...prev.autoMessage,
                          interval: [Number(e.target.value) * 1000, prev.autoMessage.interval[1]],
                        },
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                      min="1"
                    />
                    <span className="text-gray-500">至</span>
                    <input
                      type="number"
                      value={config.autoMessage.interval[1] / 1000}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        autoMessage: {
                          ...prev.autoMessage,
                          interval: [prev.autoMessage.interval[0], Number(e.target.value) * 1000],
                        },
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                      min="1"
                    />
                  </div>
                </div>

                {/* 消息列表 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">消息列表</label>
                  <div className="space-y-3">
                    {config.autoMessage.messages.map((message, index) => (
                      <div key={index} className="flex gap-3 items-center group">
                        <input
                          type="text"
                          value={message}
                          onChange={e => handleMessageChange(index, e.target.value)}
                          className={`flex-1 px-3 py-2 border border-gray-300 rounded-md transition-all ${
                            message.length > 50
                              ? 'border-red-300 focus:border-red-300 focus:shadow-[0_0_0_1px_#FCA5A5,0_1px_2px_0_rgba(0,0,0,0.05)]'
                              : ''
                          }`}
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
                            checked={config.autoMessage.pinTops.includes(index)}
                            onChange={(e) => {
                              const newPinTops = e.target.checked
                                ? [...config.autoMessage.pinTops, index]
                                : config.autoMessage.pinTops.filter(i => i !== index)
                              setConfig(prev => ({
                                ...prev,
                                autoMessage: { ...prev.autoMessage, pinTops: newPinTops },
                              }))
                            }}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm text-gray-600">置顶</span>
                        </label>
                        <button
                          onClick={() => {
                            const newMessages = config.autoMessage.messages.filter((_, i) => i !== index)
                            setConfig(prev => ({
                              ...prev,
                              autoMessage: { ...prev.autoMessage, messages: newMessages },
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
                      onClick={() => setConfig(prev => ({
                        ...prev,
                        autoMessage: {
                          ...prev.autoMessage,
                          messages: [...prev.autoMessage.messages, ''],
                        },
                      }))}
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
                    checked={config.autoMessage.random}
                    onChange={e => setConfig(prev => ({
                      ...prev,
                      autoMessage: { ...prev.autoMessage, random: e.target.checked },
                    }))}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">随机发送</span>
                </label>
              </div>
            </div>
          </div>
        )
      case 'autoPopUp':
        return (
          <div className="border rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-800">自动弹窗配置</h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    config.autoPopUp.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                  >
                    {config.autoPopUp.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
                <EnableSwitch
                  enabled={config.autoPopUp.enabled}
                  onChange={checked => setConfig(prev => ({
                    ...prev,
                    autoPopUp: { ...prev.autoPopUp, enabled: checked },
                  }))}
                />
              </div>

              <div className="space-y-6">
                {/* 间隔配置 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">弹窗间隔 (秒)</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="number"
                      value={config.autoPopUp.interval[0] / 1000}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        autoPopUp: {
                          ...prev.autoPopUp,
                          interval: [Number(e.target.value) * 1000, prev.autoPopUp.interval[1]],
                        },
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                      min="1"
                    />
                    <span className="text-gray-500">至</span>
                    <input
                      type="number"
                      value={config.autoPopUp.interval[1] / 1000}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        autoPopUp: {
                          ...prev.autoPopUp,
                          interval: [prev.autoPopUp.interval[0], Number(e.target.value) * 1000],
                        },
                      }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                      min="1"
                    />
                  </div>
                </div>

                {/* 商品ID列表 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">商品ID列表</label>
                  <div className="space-y-3">
                    {config.autoPopUp.goodsIds.map((id, index) => (
                      <div key={index} className="flex gap-3 items-center group">
                        <input
                          type="number"
                          value={id}
                          onChange={e => handleGoodsIdChange(index, Number(e.target.value))}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                          min="1"
                          placeholder="输入商品ID"
                        />
                        <button
                          onClick={() => {
                            const newIds = config.autoPopUp.goodsIds.filter((_, i) => i !== index)
                            setConfig(prev => ({
                              ...prev,
                              autoPopUp: { ...prev.autoPopUp, goodsIds: newIds },
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
                      添加商品ID
                    </button>
                  </div>
                </div>

                {/* 随机弹窗 */}
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
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Toast 提示 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* 错误提示 */}
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

      {renderContent()}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <button
          onClick={saveConfig}
          disabled={!!validationError || !hasChanges()}
          className={`px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
            validationError || !hasChanges()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          保存配置
        </button>
        <button
          onClick={startTask}
          disabled={!!validationError}
          className={`px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
            validationError
              ? 'bg-blue-300 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          开始任务
        </button>
      </div>
    </div>
  )
}
