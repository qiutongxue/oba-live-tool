import { useDebounceFn } from 'ahooks'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { CarbonPlayFilledAlt, CarbonStopFilledAlt } from '../icons/carbon'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

export function TaskButton({
  isTaskRunning,
  onStartStop,
  forbidden = false,
  connectionReady,
}: {
  isTaskRunning: boolean
  onStartStop: () => void
  forbidden?: boolean
  /** 覆盖默认的「当前账号是否已连接」判断，用于多账号场景 */
  connectionReady?: boolean
}) {
  const currentIsConnected = useCurrentLiveControl(context => context.isConnected)
  const isConnected = connectionReady
    ? 'connected'
    : currentIsConnected === 'connected'
      ? 'connected'
      : 'disconnected'
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
              disabled={forbidden || isConnected !== 'connected'}
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
