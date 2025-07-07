import { useEffect, useState } from 'react'

type OSPlatform = 'darwin' | 'win32' | 'linux' | 'unknown'

/**
 * 获取当前操作系统平台
 * @returns 返回当前操作系统平台类型
 */
export function useOSPlatform(): OSPlatform {
  const [platform, setPlatform] = useState<OSPlatform>('unknown')

  useEffect(() => {
    // 检查是否有 electron
    if (window.navigator?.userAgent) {
      const userAgent = window.navigator.userAgent.toLowerCase()
      
      if (userAgent.includes('macintosh') || userAgent.includes('darwin')) {
        setPlatform('darwin')
      } else if (userAgent.includes('windows')) {
        setPlatform('win32')
      } else if (userAgent.includes('linux')) {
        setPlatform('linux')
      }
    }
  }, [])

  return platform
}
