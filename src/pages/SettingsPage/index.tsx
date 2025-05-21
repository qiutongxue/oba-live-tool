import { Title } from '@/components/common/Title'
import { AccountSetting } from '@/pages/SettingsPage/components/AccountSetting'
import { BrowserSetting } from '@/pages/SettingsPage/components/BrowserSetting'
import { DevSetting } from '@/pages/SettingsPage/components/DevSetting'
import { OtherSetting } from '@/pages/SettingsPage/components/OtherSetting'
import { UpdateSetting } from '@/pages/SettingsPage/components/UpdateSetting'
import { useEffect } from 'react'
import { useLocation } from 'react-router'

export default function Settings() {
  const location = useLocation()

  // 处理锚点定位（因为是路由是 Hash 模式，无法自动处理锚点定位）
  useEffect(() => {
    const hash = location.hash
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  })
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
