import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Update from '@/components/update'
import { version } from '../../package.json'

export default function Settings() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-2">
          管理您的应用程序设置和偏好。
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>系统</CardTitle>
            <CardDescription>查看和管理系统相关的设置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium leading-none">软件更新</h4>
                  <p className="text-sm text-muted-foreground">
                    检查并安装最新版本的应用程序
                  </p>
                </div>
                <Update />
              </div>
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium leading-none">当前版本</h4>
                  <p className="text-sm text-muted-foreground">
                    {version}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>外观</CardTitle>
            <CardDescription>自定义应用程序的外观</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <h4 className="text-sm font-medium leading-none">主题</h4>
              <p className="text-sm text-muted-foreground">
                选择您喜欢的主题样式
              </p>
            </div>
            {/* 这里可以添加主题切换组件 */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
