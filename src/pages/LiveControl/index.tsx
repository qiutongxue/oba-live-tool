import { Title } from '@/components/common/Title'
import {
  useCurrentChromeConfig,
  useCurrentChromeConfigActions,
} from '@/hooks/useChromeConfig'

import React, { useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import InstructionsCard from './components/InstructionsCard'
import StatusCard from './components/StatusCard'

export default function BrowserControl() {
  const chromePath = useCurrentChromeConfig(context => context.path)
  const { setPath } = useCurrentChromeConfigActions()

  useEffect(() => {
    const removeListener = window.ipcRenderer.on(
      IPC_CHANNELS.chrome.setPath,
      path => {
        if (path && !chromePath) {
          setPath(path)
        }
      },
    )
    return () => removeListener()
  }, [setPath, chromePath])

  return (
    <div className="container py-8 space-y-4">
      <div>
        <Title title="直播控制台" description="连接并管理您的直播控制台" />
      </div>

      <div className="space-y-8">
        <StatusCard />
        <InstructionsCard />
      </div>
    </div>
  )
}
