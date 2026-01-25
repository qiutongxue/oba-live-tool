import { BugIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { SimpleIconsGithub } from '@/components/icons/simpleIcons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function OtherSetting() {
  const handleOpenLogFolder = async () => {
    await window.ipcRenderer.invoke(IPC_CHANNELS.app.openLogFolder)
  }

  const handleOpenGitHub = async () => {
    await window.ipcRenderer.invoke(
      IPC_CHANNELS.app.openExternal,
      'https://github.com/qiutongxue/oba-live-tool',
    )
  }

  const handleOpenIssues = async () => {
    await window.ipcRenderer.invoke(
      IPC_CHANNELS.app.openExternal,
      'https://github.com/qiutongxue/oba-live-tool/issues',
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>其他设置</CardTitle>
        <CardDescription>更多功能与信息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium leading-none">运行日志</h4>
              <p className="text-sm text-muted-foreground">查看程序运行日志文件 main.log</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenLogFolder}>
              <FileTextIcon className="h-4 w-4" />
              打开日志文件夹
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium leading-none">项目信息</h4>
              <p className="text-sm text-muted-foreground">了解更多项目相关内容</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenGitHub}>
                <SimpleIconsGithub className="h-4 w-4" />
                GitHub
                <ExternalLinkIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenIssues}>
                <BugIcon className="h-4 w-4" />
                反馈问题
                <ExternalLinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
