import { useCallback, useEffect, useState } from 'react'
import { IPC_CHANNELS } from 'shared/ipcChannels'
import { Title } from '@/components/common/Title'
import { CarbonPlayFilledAlt } from '@/components/icons/carbon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccounts } from '@/hooks/useAccounts'
import { useCurrentLiveControl } from '@/hooks/useLiveControl'
import { useToast } from '@/hooks/useToast'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

const DURATION_OPTIONS = [
  { value: '1分钟', label: '1分钟' },
  { value: '2分钟', label: '2分钟' },
  { value: '10分钟', label: '10分钟' },
  { value: '30分钟', label: '30分钟' },
  { value: '1小时', label: '1小时' },
  { value: '3小时', label: '3小时' },
  { value: '6小时', label: '6小时' },
] as const

interface RedPacketStore {
  cooldownSeconds: number
  duration: string
  lastSendTime: Record<string, number>
  setCooldownSeconds: (seconds: number) => void
  setDuration: (duration: string) => void
  setLastSendTime: (accountId: string, time: number) => void
}

const useRedPacketStore = create<RedPacketStore>()(
  persist(
    immer(set => ({
      cooldownSeconds: 60,
      duration: '6小时',
      lastSendTime: {},
      setCooldownSeconds: (seconds: number) =>
        set(state => {
          state.cooldownSeconds = seconds
        }),
      setDuration: (duration: string) =>
        set(state => {
          state.duration = duration
        }),
      setLastSendTime: (accountId: string, time: number) =>
        set(state => {
          state.lastSendTime[accountId] = time
        }),
    })),
    { name: 'red-packet-storage', version: 2 },
  ),
)

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}时`)
  if (m > 0) parts.push(`${m}分`)
  parts.push(`${s}秒`)
  return parts.join('')
}

export default function RedPacket() {
  const { toast } = useToast()
  const accountId = useAccounts(store => store.currentAccountId)
  const isConnected = useCurrentLiveControl(context => context.isConnected)
  const [isSending, setIsSending] = useState(false)

  const cooldownSeconds = useRedPacketStore(s => s.cooldownSeconds)
  const setCooldownSeconds = useRedPacketStore(s => s.setCooldownSeconds)
  const duration = useRedPacketStore(s => s.duration)
  const setDuration = useRedPacketStore(s => s.setDuration)
  const lastSendTime = useRedPacketStore(s => s.lastSendTime[accountId] ?? 0)
  const setLastSendTime = useRedPacketStore(s => s.setLastSendTime)

  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const update = () => {
      const elapsed = Math.floor((Date.now() - lastSendTime) / 1000)
      const left = Math.max(0, cooldownSeconds - elapsed)
      setRemaining(left)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [lastSendTime, cooldownSeconds])

  const isCoolingDown = remaining > 0

  const handleSend = useCallback(async () => {
    if (isSending || isCoolingDown) return
    setIsSending(true)
    try {
      const result = await window.ipcRenderer.invoke(
        IPC_CHANNELS.tasks.redPacket.send,
        accountId,
        duration,
      )
      if (result) {
        toast.success('红包投放成功')
        setLastSendTime(accountId, Date.now())
      } else {
        toast.error('红包投放失败，请查看日志')
      }
    } catch {
      toast.error('红包投放出错')
    } finally {
      setIsSending(false)
    }
  }, [isSending, isCoolingDown, accountId, duration, toast, setLastSendTime])

  const handleCooldownChange = useCallback(
    (value: string) => {
      const num = Number(value)
      if (!Number.isNaN(num) && num >= 0) {
        setCooldownSeconds(Math.floor(num))
      }
    },
    [setCooldownSeconds],
  )

  const buttonLabel = isSending
    ? '正在发放红包...'
    : isCoolingDown
      ? `冷却中 ${formatRemaining(remaining)}`
      : '一键发红包'

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Title title="一键发红包" description="自动在中控台发放店铺红包" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>投放设置</CardTitle>
          <CardDescription>
            点击按钮后将自动执行：作废生效中的红包 &rarr; 选择未生效红包点击"投放" &rarr;
            选择限时领取时长 &rarr; 确定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>限时领取时长</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              投放红包时自动选择的限时领取时长
            </p>
          </div>

          <div className="space-y-2">
            <Label>冷却时间（秒）</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={cooldownSeconds}
                onChange={e => handleCooldownChange(e.target.value)}
                className="w-32"
                min="0"
                max="86400"
                step="1"
              />
              <span className="text-sm text-muted-foreground">秒（0 = 无冷却，最大 86400 = 24小时）</span>
            </div>
            <p className="text-xs text-muted-foreground">
              每次发放红包后需等待冷却时间结束才能再次发放，防止误操作
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSend}
              disabled={isConnected !== 'connected' || isSending || isCoolingDown}
              size="lg"
            >
              <CarbonPlayFilledAlt className="mr-2 h-4 w-4" />
              {buttonLabel}
            </Button>
          </div>
          {isConnected !== 'connected' && (
            <p className="text-sm text-muted-foreground">请先连接直播控制台</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
