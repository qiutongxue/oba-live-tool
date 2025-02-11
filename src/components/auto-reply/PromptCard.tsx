import { Textarea } from '@/components/ui/textarea'
import { useAutoReplyStore } from '@/hooks/useAutoReply'
import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer'

interface PromptCardProps {
  onSave?: () => void
}

export function PromptCard({ onSave }: PromptCardProps) {
  const { prompt, setPrompt } = useAutoReplyStore()
  const [tempPrompt, setTempPrompt] = useState(prompt)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    setTempPrompt(prompt)
  }, [prompt])

  const handleSave = () => {
    setPrompt(tempPrompt)
    onSave?.()
  }

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="gap-2 w-full">
          <Settings className="h-4 w-4" />
          提示词配置
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full px-8">
          <DrawerHeader>
            <DrawerTitle>提示词配置</DrawerTitle>
            <DrawerDescription>
              配置 AI 助手的角色和回复风格
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6">
            <div className="space-y-4">
              <Textarea
                value={tempPrompt}
                onChange={e => setTempPrompt(e.target.value)}
                placeholder="请输入提示词..."
                className="min-h-[200px] font-mono text-sm"
              />

            </div>
          </div>
          <DrawerFooter>
            <Button
              onClick={handleSave}
              disabled={tempPrompt === prompt}
            >
              保存配置
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">关闭</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>

  )
}
