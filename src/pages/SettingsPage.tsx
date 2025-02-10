import { Title } from '@/components/common/Title'
import { BrowserSetting } from '@/components/settings/BrowserSetting'
import { DevSetting } from '@/components/settings/DevSetting'
import { UpdateSetting } from '@/components/settings/UpdateSetting'

export default function Settings() {
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Title title="设置" description="管理您的应用程序设置和偏好" />
      </div>

      <div className="space-y-8">
        <BrowserSetting />
        <UpdateSetting />
        <DevSetting />
      </div>
    </div>
  )
}
