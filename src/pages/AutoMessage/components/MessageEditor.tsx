import { useDebounceEffect } from 'ahooks'
import { PinIcon, PinOffIcon } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { Message } from '@/hooks/useAutoMessage'

export default function MessageEditor({
  messages,
  onChange,
}: {
  messages: Message[]
  onChange: (messages: Message[]) => void
}) {
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)
  const [text, setText] = useState(() =>
    messages.map(msg => msg.content).join('\n'),
  )

  useDebounceEffect(
    () => {
      onChange(localMessages)
    },
    [localMessages],
    { wait: 100 },
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
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

  return (
    <div>
      <div className="border rounded flex">
        <div className="bg-gray-100 text-right px-1 py-1 font-mono text-gray-500 select-none">
          {localMessages.map((msg, i) => (
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
                <PinOffIcon
                  size={16}
                  className="text-gray-400 group-hover:text-gray-600"
                />
              )}
              <span className="ml-2">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* textarea 如果单行内容过长会出现横向滚动条影响行号的对齐，故隐藏该滚动条 */}
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
    </div>
  )
}
