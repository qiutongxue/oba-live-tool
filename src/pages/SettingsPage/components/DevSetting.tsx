import { useDevMode } from '@/hooks/useDevMode'
import { useToast } from '@/hooks/useToast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Switch } from '../../../components/ui/switch'

export function DevSetting() {
  const { toast } = useToast()
  const { enabled: devMode, setEnabled: setDevMode } = useDevMode()
  const handleToggleDevMode = async (checked: boolean) => {
    try {
      setDevMode(checked)
      toast.success(checked ? '已开启开发者模式' : '已关闭开发者模式')
    } catch {
      toast.error('切换开发者模式失败')
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>开发者选项</CardTitle>
        <CardDescription>调试和高级功能</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-y-1">
          <div>
            <h4 className="text-sm font-medium leading-none mb-2">开发者模式</h4>
            <p className="text-sm text-muted-foreground">开启后可以通过鼠标右键打开开发者工具</p>
          </div>
          <Switch checked={devMode} onCheckedChange={handleToggleDevMode} />
        </div>
      </CardContent>
    </Card>
  )
}
