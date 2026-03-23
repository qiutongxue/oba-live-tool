import { useDebounceEffect, useUpdateEffect } from 'ahooks'
import { PinIcon, PinOffIcon } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { Message } from '@/hooks/useAutoMessage'

const MAX_LENGTH = 50

export default function MessageEditor({
  messages,
  unlimitedLength,
  onChange,
}: {
  messages: Message[]
  unlimitedLength: boolean
  onChange: (messages: Message[]) => void
}) {
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)
  const [text, setText] = useState(() => messages.map(msg => msg.content).join('\n'))

  useUpdateEffect(() => {
    setLocalMessages(messages)
    setText(messages.map(msg => msg.content).join('\n'))
  }, [messages])

  useDebounceEffect(
    () => {
      onChange(localMessages)
    },
    [localMessages],
    { wait: 100 },
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let text = e.target.value
    if (!unlimitedLength) {
      const lines = text.split('\n')
      const limitedLines = lines.map(line => line.slice(0, MAX_LENGTH))
      text = limitedLines.join('\n')
    }
    setText(text)
    setLocalMessages(prev =>
      text.split('\n').map((content, i) =>
        prev[i]
          ? {
              ...prev[i],
              content,
            }
          : {
              content,
              id: crypto.randomUUID(),
              pinTop: false,
            },
      ),
    )
  }

  const handleCheckboxChange = (index: number, checked: boolean) => {
    setLocalMessages(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], pinTop: checked }
      return updated
    })
  }

  const getLineLengthInfo = (index: number) => {
    const line = localMessages[index]
    if (!line) return null
    const length = line.content.length
    const isOverLimit = !unlimitedLength && length > MAX_LENGTH
    return { length, isOverLimit }
  }

  return (
    <div>
      <div className="border rounded flex">
        <div className="bg-gray-100 text-right px-1 py-1 font-mono text-gray-500 select-none">
          {localMessages.map((msg, i) => {
            const lengthInfo = getLineLengthInfo(i)
            return (
              <button
                type="button"
                title="置顶"
                key={msg.id}
                className="h-8 px-1 leading-8 cursor-pointer flex items-center justify-between group"
                onClick={() => handleCheckboxChange(i, !msg.pinTop)}
              >
                {msg.pinTop ? (
                  <PinIcon
                    size={16}
                    className="text-gray-500 group-hover:text-gray-600"
                    fill="currentColor"
                  />
                ) : (
                  <PinOffIcon size={16} className="text-gray-400 group-hover:text-gray-600" />
                )}
                <span className="ml-2">{i + 1}</span>
              </button>
            )
          })}
        </div>

        <style>
          {`.no-scrollbar::-webkit-scrollbar {
                display: none;
            }`}
        </style>

        <textarea
          value={text}
          spellCheck={false}
          onChange={handleChange}
          rows={localMessages.length || 1}
          className="bg-white flex-1 outline-none resize-none px-2 py-1 text-sm whitespace-pre border-l no-scrollbar"
          style={{ lineHeight: '2rem' }}
        />
      </div>
      {!unlimitedLength && (
        <p className="text-xs text-muted-foreground mt-1">每行最多 {MAX_LENGTH} 个字符</p>
      )}
    </div>
  )
}
