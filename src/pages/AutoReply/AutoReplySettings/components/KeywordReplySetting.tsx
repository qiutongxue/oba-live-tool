import { useMemoizedFn } from 'ahooks'
import { Plus, Trash, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'
import { useToast } from '@/hooks/useToast'

interface Rule {
  keywords: string[]
  contents: string[]
}

export function KeywordReplySetting() {
  const { config, updateKeywordRules, updateKeywordReplyEnabled } = useAutoReplyConfig()
  const rules = config.comment.keywordReply.rules
  const [showEditor, setShowEditor] = useState(false)

  const saveRules = useMemoizedFn((rulesToSave = rules) => {
    updateKeywordRules(rulesToSave)
  })

  const keywordReplyEnabled = config.comment.keywordReply.enable
  const handleKeywordEnabledChange = (checked: boolean) => {
    updateKeywordReplyEnabled(checked)
  }

  const addRule = () => {
    saveRules([...rules, { keywords: [], contents: [] }])
  }

  const keywordReplyId = useId()

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch
          id={keywordReplyId}
          checked={keywordReplyEnabled}
          onCheckedChange={handleKeywordEnabledChange}
        />
        <Label htmlFor={keywordReplyId}>启用关键词回复</Label>
      </div>

      {keywordReplyEnabled && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">关键词回复规则</h3>
            <div className="flex items-center gap-x-2">
              <Button variant={'outline'} size="sm" onClick={() => setShowEditor(prev => !prev)}>
                {showEditor ? '普通模式' : '批量编辑'}
              </Button>
              <Button size="sm" onClick={addRule} className="flex items-center gap-1">
                <Plus className="h-4 w-4" /> 添加规则
              </Button>
            </div>
          </div>

          {showEditor ? (
            <KeywordReplyEditor
              rules={rules}
              onSave={rules => {
                updateKeywordRules(rules)
              }}
            />
          ) : (
            <CommonKeywordManager rules={rules} saveRules={saveRules} />
          )}
        </>
      )}
    </div>
  )
}

function CommonKeywordManager({
  rules,
  saveRules,
}: {
  rules: Rule[]
  saveRules: (rules: Rule[]) => void
}) {
  const updateRuleNestedArray = useMemoizedFn(
    (
      ruleIndex: number,
      key: 'keywords' | 'contents',
      updateFn: (currentArray: string[]) => string[],
    ) => {
      const newRules = rules.map((rule, index) => {
        if (index === ruleIndex) {
          const currentArray = rule[key]
          const newArray = updateFn(currentArray)
          return {
            ...rule,
            [key]: newArray,
          }
        }
        return rule
      })

      saveRules(newRules)
    },
  )

  const removeRule = useCallback(
    (index: number) => {
      const newRules = rules.filter((_, i) => i !== index)
      saveRules(newRules)
    },
    [rules, saveRules],
  )

  const addKeyword = useCallback(
    (ruleIndex: number, keyword: string) => {
      const trimmedKeyword = keyword.trim()
      if (!trimmedKeyword) return
      updateRuleNestedArray(ruleIndex, 'keywords', currentKeywords => [
        ...currentKeywords,
        trimmedKeyword,
      ])
    },
    [updateRuleNestedArray],
  )

  const removeKeyword = useCallback(
    (ruleIndex: number, keywordIndex: number) => {
      updateRuleNestedArray(ruleIndex, 'keywords', currentKeywords =>
        currentKeywords.filter((_, kIdx) => kIdx !== keywordIndex),
      )
    },
    [updateRuleNestedArray],
  )

  const addContent = useCallback(
    (ruleIndex: number, content: string) => {
      const trimmedContent = content.trim()
      if (!trimmedContent) return
      updateRuleNestedArray(ruleIndex, 'contents', currentContents => [
        ...currentContents,
        trimmedContent,
      ])
    },
    [updateRuleNestedArray],
  )

  const removeContent = useCallback(
    (ruleIndex: number, contentIndex: number) => {
      updateRuleNestedArray(ruleIndex, 'contents', currentContents =>
        currentContents.filter((_, cIdx) => cIdx !== contentIndex),
      )
    },
    [updateRuleNestedArray],
  )

  return rules.length === 0 ? (
    <div className="text-center py-8 border rounded-md bg-muted/30">
      <p className="text-muted-foreground">暂无规则，请点击"添加规则"创建</p>
    </div>
  ) : (
    <div className="space-y-4">
      {rules.map((rule, ruleIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 下标无妨
        <Card key={ruleIndex} className="border-dashed">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">规则 {ruleIndex + 1}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => removeRule(ruleIndex)}>
              <Trash className="h-4 w-4 text-destructive" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">关键词</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {rule.keywords.map((keyword, keywordIndex) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: 下标无妨
                    key={keywordIndex}
                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center"
                  >
                    {keyword}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1"
                      onClick={() => removeKeyword(ruleIndex, keywordIndex)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="输入关键词..."
                  className="flex-1"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      addKeyword(ruleIndex, e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={e => {
                    const input = e.currentTarget.previousSibling as HTMLInputElement
                    addKeyword(ruleIndex, input.value)
                    input.value = ''
                  }}
                >
                  添加
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">回复内容</h4>
              <div className="space-y-2 mb-2">
                {rule.contents.map((content, contentIndex) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: 下标无妨
                    key={contentIndex}
                    className="bg-muted p-2 rounded-md text-sm flex items-start justify-between group"
                  >
                    <div>{content}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeContent(ruleIndex, contentIndex)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="输入回复内容..."
                  className="flex-1"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      addContent(ruleIndex, e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={e => {
                    const input = e.currentTarget.previousSibling as HTMLInputElement
                    addContent(ruleIndex, input.value)
                    input.value = ''
                  }}
                >
                  添加
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function KeywordReplyEditor({ rules, onSave }: { rules: Rule[]; onSave: (rules: Rule[]) => void }) {
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
        throw new Error(`第 ${index + 1} 行错误：请至少提供一个关键词和一条回复内容`)
      }
      const keywords = items[0].split('/').map(s => s.trim())
      const emptyKeywordIndex = keywords.findIndex(kw => kw.length === 0)
      if (emptyKeywordIndex >= 0) {
        throw new Error(`第 ${index + 1} 行错误：第 ${emptyKeywordIndex + 1} 个关键词是空的`)
      }
      const contents = items.slice(1).map(s => s.trim())
      const emptyContentIndex = contents.findIndex(con => con.length === 0)
      if (emptyContentIndex >= 0) {
        throw new Error(`第 ${index + 1} 行错误：第 ${emptyContentIndex + 1} 条回复内容是空的`)
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
              使用 <kbd>|</kbd> 分隔关键字和回复内容， 使用 <kbd>/</kbd> 分隔多个关键字， 使用{' '}
              <kbd>|</kbd> 分隔多个回复内容
            </p>
            <p className="pl-4">如：关键字A/关键字B/关键字C|回复内容a|回复内容b|回复内容c</p>
            <p>每一行对应一条规则，每条回复内容不得超过50个字符</p>
          </div>
        </div>
        <Button className="self-end" onClick={handleSaveBtnClick} disabled={!hasChanges}>
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
