import type { AIConfigType } from '@/hooks/useAIProvider'
import { useAIProvider } from '@/hooks/useAIProvider'
import { useProviders } from '@/hooks/useProviders'
import { Badge } from '../ui/badge'

interface AIModelInfoProps {
  type?: AIConfigType
}

export default function AIModelInfo({ type = 'chat' }: AIModelInfoProps) {
  const { config: aiConfig } = useAIProvider(type)
  const providers = useProviders()
  return (
    <div className="flex items-center gap-2">
      <Badge variant="dark" className="gap-1">
        <span className="text-xs font-medium">提供商:</span>
        <span>{providers[aiConfig.provider]?.name ?? aiConfig.provider}</span>
      </Badge>
      <Badge variant="outline" className="gap-1">
        <span className="text-xs font-medium">模型:</span>
        <span className="font-mono">{aiConfig.model}</span>
      </Badge>
    </div>
  )
}
