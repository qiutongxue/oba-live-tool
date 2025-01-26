import React from 'react'

interface TaskPanelProps {
  title: string
  enabled: boolean
  onEnableChange: (checked: boolean) => void
  scheduler: {
    interval: [number, number]
  }
  onSchedulerChange: (interval: [number, number]) => void
  children?: React.ReactNode
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

export function TaskPanel({
  title,
  enabled,
  onEnableChange,
  scheduler,
  onSchedulerChange,
  children,
}: TaskPanelProps) {
  return (
    <div className="border rounded-xl shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
            >
              {enabled ? '已启用' : '已禁用'}
            </span>
          </div>
          <EnableSwitch enabled={enabled} onChange={onEnableChange} />
        </div>

        <div className="space-y-6">
          {/* 间隔配置 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-3">执行间隔 (秒)</label>
            <div className="flex gap-4 items-center">
              <input
                type="number"
                value={scheduler.interval[0] / 1000}
                onChange={e => onSchedulerChange([Number(e.target.value) * 1000, scheduler.interval[1]])}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                min="1"
              />
              <span className="text-gray-500">至</span>
              <input
                type="number"
                value={scheduler.interval[1] / 1000}
                onChange={e => onSchedulerChange([scheduler.interval[0], Number(e.target.value) * 1000])}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md transition-shadow"
                min="1"
              />
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
