import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'
import { AIReplySetting } from './components/AIReplySetting'
import { BlocklistManager } from './components/BlocklistManager'
import { CompassSetting } from './components/CompassSetting'
import { HideUsernameSetting } from './components/HideUsernameSetting'
import { KeywordReplySetting } from './components/KeywordReplySetting'
import { ListeningSourceSetting } from './components/ListeningSourceSetting'
import { WebSocketSetting } from './components/WebSocketSetting'

export default function AutoReplySettings() {
  const { config } = useAutoReplyConfig()
  const navigate = useNavigate()

  const ExtraSetting = useMemo(() => {
    switch (config.entry) {
      case 'compass':
        return <CompassSetting />
      default:
        return null
    }
  }, [config.entry])

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="返回">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">自动回复设置</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>自动回复设置</CardTitle>
          <CardDescription>配置自动回复的行为和监听来源</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ListeningSourceSetting />
          <Separator />
          <HideUsernameSetting />
          <Separator />
          <div className="space-y-4">
            <Tabs defaultValue="keyword">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">自动回复评论设置</h3>
                <TabsList>
                  <TabsTrigger value="keyword">关键词回复</TabsTrigger>
                  <TabsTrigger value="ai">AI回复</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="keyword" className="space-y-4">
                <KeywordReplySetting />
              </TabsContent>
              <TabsContent value="ai" className="space-y-4">
                <AIReplySetting />
              </TabsContent>
            </Tabs>
          </div>

          <Separator />
          {ExtraSetting}
          {ExtraSetting && <Separator />}
          <BlocklistManager />
          <Separator />
          <WebSocketSetting />
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-muted-foreground">设置会自动保存</p>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              返回
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
