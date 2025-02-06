import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckIcon, PlayIcon, StopIcon } from '@radix-ui/react-icons'
import React from 'react'

interface TaskOperationButtonsProps {
  hasChanges: () => boolean
  isConnected: boolean
  isTaskRunning: boolean
  onSave: () => void
  onStartStop: () => void
}

export function TaskOperationButtons({
  hasChanges,
  isConnected,
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

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant={isTaskRunning ? 'destructive' : 'default'}
                onClick={onStartStop}
                disabled={!isConnected}
              >
                {isTaskRunning
                  ? (
                      <>
                        <StopIcon className="mr-2 h-4 w-4" />
                        停止任务
                      </>
                    )
                  : (
                      <>
                        <PlayIcon className="mr-2 h-4 w-4" />
                        开始任务
                      </>
                    )}
              </Button>
            </span>
          </TooltipTrigger>
          {!isConnected && (
            <TooltipContent>
              <p>请先连接直播控制台</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
