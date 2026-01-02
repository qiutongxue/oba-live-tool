import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const instructions = [
  '选择平台并点击"连接直播控制台"按钮，等待登录',
  '登录成功后，即可使用自动发言和自动弹窗功能',
  '自动回复功能目前仅对抖音小店和巨量百应开放',
]

const InstructionsCard = React.memo(() => (
  <Card>
    <CardHeader>
      <CardTitle>使用说明</CardTitle>
      <CardDescription>了解如何使用直播控制台</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {instructions.map((instruction, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 下标无妨
          <div className="flex gap-3" key={index}>
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-primary">{index + 1}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-6">{instruction}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
))

export default InstructionsCard
