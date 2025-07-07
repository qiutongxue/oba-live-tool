import { providers } from 'shared/providers'
import { useAIChatStore } from '@/hooks/useAIChat'
import { Badge } from '../ui/badge'

export default function AIModelInfo() {
  const aiConfig = useAIChatStore(context => context.config)
  return (
    <div className="flex items-center gap-2">
      <Badge variant="dark" className="gap-1">
        <span className="text-xs font-medium">提供商:</span>
        <span>{providers[aiConfig.provider].name}</span>
      </Badge>
      <Badge variant="outline" className="gap-1">
        <span className="text-xs font-medium">模型:</span>
        <span className="font-mono">{aiConfig.model}</span>
      </Badge>
    </div>
  )
}
