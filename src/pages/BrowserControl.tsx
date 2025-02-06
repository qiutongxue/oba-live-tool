import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useChromeConfig } from '@/hooks/useChromeConfig'
import { useDevMode } from '@/hooks/useDevMode'
import { useLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { CheckIcon, GlobeIcon } from '@radix-ui/react-icons'
import React, { useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'

export default function BrowserControl() {
  const { isConnected, setIsConnected } = useLiveControl()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const { setPath, path: chromePath } = useChromeConfig()
  const { enabled: devMode } = useDevMode()

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(IPC_CHANNELS.setChromePath, (path) => {
      if (path && !chromePath) {
        setPath(path)
      }
    })
    return () => removeListener()
  }, [setPath, chromePath])

  const connectLiveControl = async () => {
    try {
      setIsLoading(true)
      const { success } = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.liveControl.connect,
        { headless: !devMode, chromePath },
      )

      if (success) {
        setIsConnected(true)
        toast.success('已连接到直播控制台')
      }
      else {
        toast.error('连接直播控制台失败')
      }
    }
    catch {
      toast.error('连接直播控制台失败')
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">直播控制台</h1>
        <p className="text-muted-foreground mt-2">
          连接并管理您的直播控制台。
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>控制台状态</CardTitle>
            <CardDescription>查看并管理直播控制台的连接状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? '已连接' : '未连接'}
                </span>
              </div>
              <Button
                variant={isConnected ? 'secondary' : 'default'}
                onClick={connectLiveControl}
                disabled={isLoading || isConnected}
                size="sm"
              >
                {isConnected
                  ? (
                      <>
                        <CheckIcon className="mr-2 h-4 w-4" />
                        已连接
                      </>
                    )
                  : (
                      <>
                        <GlobeIcon className="mr-2 h-4 w-4" />
                        {isLoading ? '连接中...' : '连接直播控制台'}
                      </>
                    )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
            <CardDescription>了解如何使用直播控制台</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground leading-6">
                  点击"连接直播控制台"按钮，等待登录抖音小店
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground leading-6">
                  登录成功后，即可使用自动发言和自动弹窗功能
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
