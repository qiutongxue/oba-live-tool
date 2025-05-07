import { useEffect, useState } from 'react'

type OSPlatform = 'Windows' | 'MacOS' | 'Unknown'

export function useOSPlatform(): OSPlatform {
  const [platform, setPlatform] = useState<OSPlatform>('Unknown')

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('win')) {
      setPlatform('Windows')
    } else if (userAgent.includes('mac')) {
      setPlatform('MacOS')
    } else {
      setPlatform('Unknown')
    }
  }, [])

  return platform
}
