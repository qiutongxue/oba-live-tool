import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'

interface Rule {
  keywords: string[]
  contents: string[]
}

export default function KeywordReplyEditor({
  rules,
  onSave,
}: {
  rules: Rule[]
  onSave: (rules: Rule[]) => void
}) {
  const toLocalText = useCallback((rules: Rule[]): string => {
    return rules
      .map(rule => {
        return `${rule.keywords.join('/')}|${rule.contents.join('|')}`
      })
      .join('\n')
  }, [])

  const { toast } = useToast()
  const [localText, setLocalText] = useState(toLocalText(rules))
  const [savedText, setSavedText] = useState(localText)

  const lines = useMemo(() => localText.split('\n'), [localText])
  const hasChanges = localText !== savedText

  const toRules = (lines: string[]): Rule[] => {
    const rules = lines.map((line, index) => {
      const items = line.split('|')
      if (items.length < 2) {
        throw new Error(
          `第 ${index + 1} 行错误：请至少提供一个关键词和一条回复内容`,
        )
      }
      const keywords = items[0].split('/').map(s => s.trim())
      const emptyKeywordIndex = keywords.findIndex(kw => kw.length === 0)
      if (emptyKeywordIndex >= 0) {
        throw new Error(
          `第 ${index + 1} 行错误：第 ${emptyKeywordIndex + 1} 个关键词是空的`,
        )
      }
      const contents = items.slice(1).map(s => s.trim())
      const emptyContentIndex = contents.findIndex(con => con.length === 0)
      if (emptyContentIndex >= 0) {
        throw new Error(
          `第 ${index + 1} 行错误：第 ${emptyContentIndex + 1} 条回复内容是空的`,
        )
      }
      return {
        keywords,
        contents,
      }
    })
    return rules
  }

  const handleSaveBtnClick = () => {
    try {
      const rules = toRules(lines)
      onSave(rules)
      setSavedText(localText)
      toast.success('保存成功')
    } catch (e) {
      if (e instanceof Error) {
        // 格式错误
        toast.error(e.message)
      } else {
        toast.error(String(e))
      }
    }
  }

  useEffect(() => {
    setLocalText(toLocalText(rules))
  }, [rules, toLocalText])

  return (
    <div>
      <div className="flex justify-between">
        <div>
          <div className="text-sm">批量编辑</div>
          <div className="text-muted-foreground text-xs mt-1">
            <p>
              使用 <kbd>|</kbd> 分隔关键字和回复内容， 使用 <kbd>/</kbd>{' '}
              分隔多个关键字， 使用 <kbd>|</kbd> 分隔多个回复内容
            </p>
            <p className="pl-4">
              如：关键字A/关键字B/关键字C|回复内容a|回复内容b|回复内容c
            </p>
            <p>每一行对应一条规则，每条回复内容不得超过50个字符</p>
          </div>
        </div>
        <Button
          className="self-end"
          onClick={handleSaveBtnClick}
          disabled={!hasChanges}
        >
          保存
        </Button>
      </div>

      <div className="flex mt-4">
        <div className="bg-gray-100 text-right px-1 py-1 font-mono text-gray-500 select-none">
          {lines.map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: 用下标无所谓的
              key={i}
              className="h-8 px-1 leading-8 flex items-center justify-between group"
            >
              <span className="ml-2">{i + 1}</span>
            </div>
          ))}
        </div>
        <style>
          {`.no-scrollbar::-webkit-scrollbar {
                display: none;
            }`}
        </style>
        <textarea
          className="leading-8 bg-white flex-1 outline-none resize-none px-2 py-1 text-sm whitespace-pre border rounded no-scrollbar"
          value={localText}
          spellCheck="false"
          onChange={e => setLocalText(e.target.value)}
          rows={lines.length || 1}
        />
      </div>
    </div>
  )
}
