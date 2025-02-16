import { useLiveControl } from '@/hooks/useLiveControl'
import { PlayIcon, StopIcon } from '@radix-ui/react-icons'
import { useDebounceFn } from 'ahooks'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

export function TaskButton({
  isTaskRunning,
  onStartStop,
}: {
  isTaskRunning: boolean
  onStartStop: () => void
}) {
  const { isConnected } = useLiveControl()
  const debouncedFn = useDebounceFn(onStartStop, { wait: 500, leading: true, trailing: false })
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant={isTaskRunning ? 'destructive' : 'default'}
              onClick={() => debouncedFn.run()}
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
  )
}
