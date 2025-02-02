import Update from '@/components/update'

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">应用设置</h2>
          <p className="text-gray-500 text-sm mt-1">管理应用的基本设置和更新</p>
        </div>

        <div className="space-y-6">
          {/* 更新检查部分 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-700 mb-4">软件更新</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Update />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
