import { BrowserSetting } from '@/components/settings/BrowserSetting'
import { DevSetting } from '@/components/settings/DevSetting'
import { UpdateSetting } from '@/components/settings/UpdateSetting'

export default function Settings() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-2">
          管理您的应用程序设置和偏好。
        </p>
      </div>

      <div className="space-y-8">
        <BrowserSetting />
        <UpdateSetting />
        <DevSetting />
      </div>
    </div>
  )
}
