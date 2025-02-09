import { Button } from '@/components/ui/button'
import { CheckIcon } from '@radix-ui/react-icons'
import React from 'react'
import { TaskButton } from './TaskButton'

interface TaskOperationButtonsProps {
  hasChanges: () => boolean
  isTaskRunning: boolean
  onSave: () => void
  onStartStop: () => void
}

export function TaskOperationButtons({
  hasChanges,
  isTaskRunning,
  onSave,
  onStartStop,
}: TaskOperationButtonsProps) {
  return (
    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={onSave}
        disabled={!hasChanges()}
      >
        <CheckIcon className="mr-2 h-4 w-4" />
        保存配置
      </Button>

      <TaskButton
        isTaskRunning={isTaskRunning}
        onStartStop={onStartStop}
      />
    </div>
  )
}
