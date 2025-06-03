import type React from 'react'
import { useEffect, useState } from 'react'
import { Input } from '../ui/input'

type ValidatedNumberInputProps = {
  value: number
  min?: number
  max?: number
  step?: number
  onCommit: (newValue: number) => void
  className?: string
  style?: React.CSSProperties
}

export default function ValidatedNumberInput({
  value,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  onCommit,
  className,
  style,
  ...props
}: ValidatedNumberInputProps & React.ComponentProps<'input'>) {
  const [draft, setDraft] = useState<string>(String(value))

  // 当外部 value 改变时同步 draft（比如父组件更新了）
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number(draft)
    // TODO: 添加友好的提示：值不能为……
    if (!Number.isNaN(parsed) && min <= parsed && parsed <= max) {
      if (parsed !== value) {
        onCommit(parsed)
      }
    } else {
      // 恢复显示旧值
      setDraft(String(value))
    }
  }

  return (
    <Input
      type="number"
      className={className}
      style={style}
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          commit()
          e.currentTarget.blur()
        }
      }}
      {...props}
    />
  )
}
