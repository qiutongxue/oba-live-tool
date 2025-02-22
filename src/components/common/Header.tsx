import { Package } from 'lucide-react'
import { AccountSwitcher } from '../AccountSwitcher'

export function Header() {
  return (
    <header className="w-full bg-white shadow-sm px-6 flex h-16 items-center justify-between">
      {/* <div className=""> */}
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold text-gray-800 sm:text-xl">
          直播助手
        </h1>
      </div>

      <div className="flex items-center">
        <AccountSwitcher />
      </div>
      {/* </div> */}
    </header>
  )
}
