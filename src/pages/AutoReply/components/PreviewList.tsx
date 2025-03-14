import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAutoReply } from '@/hooks/useAutoReply'
import { SendHorizontalIcon } from 'lucide-react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import React from 'react'

export default function PreviewList({
  setHighLight,
}: { setHighLight: (commentId: string | null) => void }) {
  const { replies, comments, autoSend, setAutoSend } = useAutoReply()
  const [showWarning, setShowWarning] = React.useState(false)

  const handleSendReply = async (replyContent: string, _commentId: string) => {
    try {
      await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.autoReply.sendReply,
        replyContent,
      )
      // removeReply(commentId)
    } catch (error) {
      console.error('发送回复失败:', error)
    }
  }

  const handleAutoSendChange = (checked: boolean) => {
    if (checked) {
      setShowWarning(true)
    } else {
      setAutoSend(false)
    }
  }

  const handleConfirmAutoSend = () => {
    setAutoSend(true)
    setShowWarning(false)
  }

  const handleCancelAutoSend = () => {
    setShowWarning(false)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>回复预览</CardTitle>
              <CardDescription>AI 生成的回复内容</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-send"
                checked={autoSend}
                onCheckedChange={handleAutoSendChange}
              />
              <Label htmlFor="auto-send">自动发送</Label>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent>
          <ScrollArea className="py-2 h-[600px]">
            <div className="space-y-1">
              {replies.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无回复数据
                </div>
              ) : (
                replies.map(reply => {
                  const relatedComment = comments.find(
                    c => c.id === reply.commentId,
                  )
                  return (
                    <div
                      key={reply.commentId}
                      className="group px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors"
                      onMouseEnter={() => setHighLight(reply.commentId)}
                      onMouseLeave={() => setHighLight(null)}
                    >
                      <div className="flex flex-col gap-1">
                        {relatedComment && (
                          <div className="text-xs text-muted-foreground">
                            回复：
                            {relatedComment.nickname} - {relatedComment.content}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-700 flex-1">
                            {reply.replyContent}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="invisible group-hover:visible h-6 w-6"
                            onClick={() =>
                              handleSendReply(reply.replyContent, reply.commentId)
                            }
                          >
                            <SendHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认开启自动发送？</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                请注意：开启自动发送后，AI生成的所有回复都会自动发送到直播间，这可能会带来以下风险：
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>AI可能会生成不恰当或不相关的回复</li>
                <li>回复内容可能会违反平台规则</li>
                <li>可能会影响与观众的真实互动体验</li>
              </ul>
              <p className="font-medium">
                建议在开启自动发送前，先观察一段时间AI的回复质量。您也可以通过点击每条回复预览旁边的小飞机按钮来手动发送。
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAutoSend}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAutoSend}>
              我已了解风险，仍然开启
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
