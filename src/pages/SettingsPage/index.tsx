import { Title } from '@/components/common/Title'
import { AccountSetting } from '@/pages/SettingsPage/components/AccountSetting'
import { BrowserSetting } from '@/pages/SettingsPage/components/BrowserSetting'
import { DevSetting } from '@/pages/SettingsPage/components/DevSetting'
import { OtherSetting } from '@/pages/SettingsPage/components/OtherSetting'
import { UpdateSetting } from '@/pages/SettingsPage/components/UpdateSetting'

export default function Settings() {
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Title title="设置" description="管理您的应用程序设置和偏好" />
      </div>

      <div className="space-y-8">
        <BrowserSetting />
        <UpdateSetting />
        <AccountSetting />
        <DevSetting />
        <OtherSetting />
      </div>
    </div>
  )
}
