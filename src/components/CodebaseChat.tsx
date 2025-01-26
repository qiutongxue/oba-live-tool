import React, { useState } from 'react'

export default function CodebaseChat() {
  const [userInput, setUserInput] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{
    role: 'user' | 'assistant'
    content: string
  }>>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim())
      return

    // 添加用户消息到历史记录
    setChatHistory(prev => [...prev, { role: 'user', content: userInput }])

    try {
      // 调用后端 API
      const response = await window.ipcRenderer.invoke('chat-with-codebase', userInput)

      // 添加助手回复到历史记录
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }])
    }
    catch (error) {
      console.error('聊天请求失败:', error)
    }

    setUserInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* 聊天历史记录 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="询问关于代码库的问题..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
