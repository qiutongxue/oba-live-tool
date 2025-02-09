import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useAutoReplyStore } from '@/hooks/useAutoReply'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'

export function PromptCard() {
  const { prompt, setPrompt } = useAutoReplyStore()
  const [tempPrompt, setTempPrompt] = useState(prompt)

  useEffect(() => {
    setTempPrompt(prompt)
  }, [prompt])

  const handleSave = () => {
    setPrompt(tempPrompt)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>提示词配置</CardTitle>
        <CardDescription>
          配置 AI 助手的角色和回复风格
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-4">
        <Textarea
          value={tempPrompt}
          onChange={e => setTempPrompt(e.target.value)}
          placeholder="请输入提示词..."
          className="min-h-[120px] font-mono text-sm"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={tempPrompt === prompt}
          >
            保存配置
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
