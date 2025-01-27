import React from 'react'

interface TaskOperationButtonsProps {
  validationError: string | null
  hasChanges: () => boolean
  isStarting: boolean
  isConnected: boolean
  isTaskRunning: boolean
  onSave: () => void
  onStartStop: () => void
}

export function TaskOperationButtons({
  validationError,
  hasChanges,
  isStarting,
  isConnected,
  isTaskRunning,
  onSave,
  onStartStop,
}: TaskOperationButtonsProps) {
  return (
    <div className="flex justify-end gap-4">
      <button
        type="button"
        onClick={onSave}
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
        type="button"
        onClick={onStartStop}
        disabled={!!validationError || isStarting || !isConnected}
        className={`px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
          validationError || isStarting || !isConnected
            ? 'bg-blue-300 text-white cursor-not-allowed'
            : isTaskRunning
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={!isConnected ? '请先连接直播控制台' : ''}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isTaskRunning
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 15l-3-3m0 0l3-3m-3 3h12" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
        </svg>
        {isTaskRunning ? '停止任务' : '开始任务'}
      </button>
    </div>
  )
}
