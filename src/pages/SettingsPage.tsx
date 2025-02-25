import { Title } from '@/components/common/Title'
import { AccountSetting } from '@/components/settings/AccountSetting'
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
        <AccountSetting />
        <DevSetting />

        <div className="mt-12 flex justify-center">
          <a
            href="https://github.com/qiutongxue/oba-live-tool"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-gray-700 transition-all hover:bg-gray-100"
          >
            <svg
              height="20"
              width="20"
              viewBox="0 0 16 16"
              fill="currentColor"
              role="img"
              aria-label="GitHub logo"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span>在 GitHub 上查看项目</span>
          </a>
        </div>
      </div>
    </div>
  )
}
