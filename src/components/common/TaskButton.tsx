import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useDebounceFn } from 'ahooks'
import { Button } from '../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { CarbonPlayFilledAlt, CarbonStopFilledAlt } from '../icons/carbon'

export function TaskButton({
  isTaskRunning,
  onStartStop,
}: {
  isTaskRunning: boolean
  onStartStop: () => void
}) {
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const debouncedFn = useDebounceFn(onStartStop, {
    wait: 500,
    leading: true,
    trailing: false,
  })
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant={isTaskRunning ? 'destructive' : 'default'}
              onClick={() => debouncedFn.run()}
              disabled={isConnected !== 'connected'}
            >
              {isTaskRunning ? (
                <>
                  <CarbonStopFilledAlt className="mr-2 h-4 w-4" />
                  停止任务
                </>
              ) : (
                <>
                  <CarbonPlayFilledAlt className="mr-2 h-4 w-4" />
                  开始任务
                </>
              )}
            </Button>
          </span>
        </TooltipTrigger>
        {isConnected !== 'connected' && (
          <TooltipContent>
            <p>请先连接直播控制台</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
