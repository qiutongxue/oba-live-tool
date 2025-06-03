import AIModelInfo from '@/components/ai-chat/AIModelInfo'
import { APIKeyDialog } from '@/components/ai-chat/APIKeyDialog'
import ValidatedNumberInput from '@/components/common/ValidateNumberInput'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  type AutoReplyConfig,
  type EventMessageType,
  type MessageOf,
  type SimpleEventReplyMessage,
  useAutoReply,
} from '@/hooks/useAutoReply'
import { useToast } from '@/hooks/useToast'
import type { StringFilter, StringFilterConfig } from '@/utils/filter'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMemoizedFn } from 'ahooks'
import { pick } from 'lodash-es'
import {
  ArrowLeft,
  FilterIcon,
  FunnelPlusIcon,
  Plus,
  PlusIcon,
  Trash,
  Trash2Icon,
  X,
  XIcon,
} from 'lucide-react'
import { type FC, useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

// 监听源类型
type ListeningSource = AutoReplyConfig['entry']

// 自动回复类型
const autoReplyTypes = [
  {
    id: 'room_enter',
    name: '进入直播间',
    default: '@{用户名} 欢迎来到直播间，感谢支持！',
  },
  {
    id: 'room_like',
    name: '点赞直播间',
    default: '谢谢{用户名}的点赞，爱你哟~',
  },
  {
    id: 'room_follow',
    name: '关注直播间',
    default: '感谢{用户名}的关注，我们会带来更多精彩内容！',
  },
  {
    id: 'subscribe_merchant_brand_vip',
    name: '加入品牌会员',
    default: '感谢{用户名}成为我们的品牌会员，您将享受专属特权！',
  },
  {
    id: 'live_order',
    name: '购买商品',
    default: '感谢{用户名}购买，宝贝很快就发货啦~',
  },
  {
    id: 'ecom_fansclub_participate',
    name: '加入粉丝团',
    default: '欢迎{用户名}加入粉丝团大家庭！',
  },
] as const

const conditionTextMap = {
  eq: '等于',
  includes: '包含',
  startsWith: '开头为',
  endsWith: '结尾为',
} as const

const fieldNameMap = {
  nick_name: '昵称',
  content: '内容',
  order_status: '订单状态',
  product_title: '商品名称',
} as const

const getFilterFieldMapping = (msgType: EventMessageType) => {
  switch (msgType) {
    case 'live_order':
      return ['nick_name', 'product_title', 'order_status'] as const
    default:
      return ['nick_name'] as const
  }
}

type MessageFilterForm<T extends EventMessageType> = {
  type: keyof StringFilter
  field: keyof MessageOf<T>
  content: string[]
}

function MessageFilter<T extends EventMessageType>({
  filterForm,
  onChange,
  msgType,
}: {
  filterForm: MessageFilterForm<T>
  onChange: (newFilterForm: MessageFilterForm<T>) => void
  msgType: T
}) {
  const [open, setOpen] = useState(false)

  const currentFieldMapping = getFilterFieldMapping(msgType).map(value => {
    return [value, fieldNameMap[value]]
  })

  const handleFilterContentChange = (newValue: string, index: number) => {
    const updated = [...filterForm.content]
    updated[index] = newValue
    onChange({
      ...filterForm,
      content: updated,
    })
  }

  const handleFilterContentAdd = () => {
    onChange({
      ...filterForm,
      content: [...filterForm.content, ''],
    })
  }

  const handleFilterContentRemove = (index: number) => {
    onChange({
      ...filterForm,
      content: filterForm.content.filter((_, i) => i !== index),
    })
  }

  const handleFilterFieldChange = (newFiled: string) => {
    onChange({
      ...filterForm,
      field: newFiled as typeof filterForm.field,
    })
  }

  const handleFilterTypeChange = (newType: string) => {
    onChange({
      ...filterForm,
      type: newType as typeof filterForm.type,
    })
  }

  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-4"
          onClick={() => setOpen(prev => !prev)}
        >
          <FunnelPlusIcon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="">
          <div className="text-sm">过滤器</div>
          <p className="text-sm text-muted-foreground">
            仅回复过滤器命中的条件
          </p>
        </div>
        <div className="grid grid-cols-4 gap-x-1 pt-2">
          <div className="col-span-4 flex flex-col space-y-2">
            <div className="flex space-x-1">
              <Select
                value={filterForm.field as string}
                onValueChange={handleFilterFieldChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择字段" />
                </SelectTrigger>
                <SelectContent>
                  {currentFieldMapping.map(([value, text]) => {
                    return (
                      <SelectItem value={value} key={value}>
                        {text}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Select
                value={filterForm.type as string}
                onValueChange={handleFilterTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择条件" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(conditionTextMap).map(([value, text]) => {
                    return (
                      <SelectItem value={value} key={value}>
                        {text}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {filterForm.content.map((v, i) => (
              <div
                className="flex space-x-1"
                // biome-ignore lint/suspicious/noArrayIndexKey: 数量少，key 用 index 不要紧的
                key={i}
              >
                <Input
                  placeholder="填写条件"
                  value={v}
                  onChange={e => handleFilterContentChange(e.target.value, i)}
                />
                <Button
                  variant="ghost"
                  onClick={() => handleFilterContentRemove(i)}
                >
                  <Trash2Icon className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" onClick={handleFilterContentAdd}>
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <PopoverClose className="absolute top-3 right-3">
          <XIcon className="w-4 h-4" onClick={() => setOpen(false)} />
        </PopoverClose>
      </PopoverContent>
    </Popover>
  )
}

const FilterText: React.FC<{
  filterConfig: StringFilterConfig
}> = ({ filterConfig }) => {
  const renderCondition = (
    field: keyof typeof fieldNameMap,
    condition: StringFilter,
  ) => {
    const label = fieldNameMap[field] || field
    const lines: {
      prefix: string
      suffix: string
      label: string
      conditionText: string
      value: string
    }[] = []

    for (const [key, values] of Object.entries(condition)) {
      if (!values || values.length === 0) return

      const conditionText = conditionTextMap[key as keyof StringFilter] || key

      values.forEach((value, index) => {
        const prefix = index === 0 ? '当' : '或'
        const suffix = index === values.length - 1 ? ' 时' : ''
        lines.push({
          prefix,
          suffix,
          label,
          conditionText,
          value,
        })
      })
    }

    return lines.map(({ prefix, suffix, conditionText, value, label }, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: 用下标问题不大
      <div key={i}>
        <span>{prefix}</span>
        <span className="px-1 text-amber-200">{label}</span>
        <span className="text-fuchsia-100">{conditionText}</span>
        <span className="px-1 text-emerald-200">{value}</span>
        <span>{suffix}</span>
      </div>
    ))
  }

  return (
    <div>
      {Object.entries(filterConfig).map(([field, condition]) =>
        renderCondition(field as keyof typeof fieldNameMap, condition),
      )}
    </div>
  )
}

// 用于管理回复消息的组件
const ReplyMessageManager: FC<{
  title: string
  description?: string
  messages: SimpleEventReplyMessage[]
  onAdd: (message: SimpleEventReplyMessage) => void
  onRemove: (index: number) => void
  placeholder?: string
  msgType: EventMessageType
}> = ({
  title,
  description,
  messages,
  onAdd,
  onRemove,
  placeholder,
  msgType,
}) => {
  const defaultFilterForm = () => ({
    type: 'eq' as const,
    field: 'nick_name' as const,
    content: [],
  })
  const [newMessage, setNewMessage] = useState('')
  const [filterForm, setFilterForm] = useState<
    MessageFilterForm<typeof msgType>
  >(defaultFilterForm())
  const { toast } = useToast()

  const handleAdd = () => {
    const trimedMessage = newMessage.trim()
    if (!trimedMessage) {
      toast.error('消息内容不能为空')
      return
    }
    const filterContent = filterForm.content
    if (!filterContent.filter(Boolean).length) {
      // 未设置过滤器
      onAdd(trimedMessage)
    } else {
      onAdd({
        content: trimedMessage,
        filter: {
          [filterForm.field]: {
            [filterForm.type]: filterForm.content,
          },
        },
      })
    }
    setNewMessage('')
    setFilterForm(defaultFilterForm())
    toast.success('添加成功')
  }

  const handleFilterFormChange = (
    newForm: MessageFilterForm<typeof msgType>,
  ) => {
    setFilterForm(newForm)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
        {messages.length === 0 ? (
          <div className="text-sm text-center py-4 text-muted-foreground">
            暂无消息
          </div>
        ) : (
          messages.map((message, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <div key={index} className="flex items-center gap-2 group">
              <div className="flex-1 text-sm p-2 rounded bg-muted/50 flex justify-between">
                <span>
                  {typeof message === 'string' ? message : message.content}
                </span>
                {typeof message !== 'string' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <FilterIcon className="w-4 h-4 text-gray-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <FilterText filterConfig={message.filter} />
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <MessageFilter
          filterForm={filterForm}
          onChange={handleFilterFormChange}
          msgType={msgType}
        />
        <Input
          placeholder={placeholder || '输入回复消息...'}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAdd}>添加</Button>
      </div>
    </div>
  )
}

// 用户屏蔽列表组件
const BlocklistManager: FC = () => {
  const { updateBlockList, config } = useAutoReply()
  const blockedUsers = config.blockList
  const [newUser, setNewUser] = useState('')

  const handleAddUser = () => {
    if (!newUser.trim()) {
      return
    }
    const updatedList = [...blockedUsers, newUser.trim()]
    updateBlockList(updatedList)
    setNewUser('')
  }

  const handleRemoveUser = (index: number) => {
    const updatedList = blockedUsers.filter((_, i) => i !== index)
    updateBlockList(updatedList)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">用户屏蔽列表</h3>
        <p className="text-sm text-muted-foreground">
          屏蔽列表中的用户将不会被自动回复
        </p>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
        {blockedUsers.length === 0 ? (
          <div className="text-sm text-center py-4 text-muted-foreground">
            暂无屏蔽用户
          </div>
        ) : (
          blockedUsers.map((user, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <div key={index} className="flex items-center gap-2 group">
              <div className="flex-1 text-sm p-2 rounded bg-muted/50">
                {user}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveUser(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="输入用户名..."
          value={newUser}
          onChange={e => setNewUser(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAddUser}>添加</Button>
      </div>
    </div>
  )
}

const Settings = () => {
  const { toast } = useToast()
  const navigate = useNavigate()

  const {
    config,
    updateEventReplyContents,
    updateGeneralSettings,
    updateKeywordReplyEnabled,
    updateEventReplyEnabled,
    updateEventReplyOptions,
    updateWSConfig,
  } = useAutoReply()

  const { entry: listeningSource } = config
  const typeReplies = pick(config, [
    'room_enter',
    'room_like',
    'room_follow',
    'subscribe_merchant_brand_vip',
    'live_order',
    'ecom_fansclub_participate',
  ])

  const keywordReplyEnabled = config.comment.keywordReply.enable

  const handleKeywordEnabledChange = (checked: boolean) => {
    updateKeywordReplyEnabled(checked)
  }

  // 处理监听源变更
  const handleSourceChange = (value: ListeningSource) => {
    updateGeneralSettings({ entry: value })
    toast.success(`已切换至${value === 'control' ? '中控台' : '大屏'}监听`)
  }

  // 自动回复消息的开关
  const handleReplyChange = (type: EventMessageType, checked: boolean) => {
    updateEventReplyEnabled(type, checked)
  }

  // 处理其余消息的回复内容
  const handleMessageAdd = (
    type: EventMessageType,
    message: SimpleEventReplyMessage,
  ) => {
    updateEventReplyContents(type, [...typeReplies[type].messages, message])
  }

  const hanldeOptionsChange = (
    type: EventMessageType,
    options: Record<string, boolean>,
  ) => {
    updateEventReplyOptions(type, options)
  }

  const handleMessageRemove = (type: EventMessageType, index: number) => {
    const newMessages = typeReplies[type].messages.filter((_, i) => i !== index)
    updateEventReplyContents(type, newMessages)
  }

  return (
    <div className="container py-8 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            title="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">自动回复设置</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>自动回复设置</CardTitle>
          <CardDescription>配置自动回复的行为和监听来源</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">监听来源</h3>
            <Select
              value={listeningSource}
              onValueChange={value =>
                handleSourceChange(value as ListeningSource)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择监听来源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="control">中控台监听</SelectItem>
                <SelectItem value="compass">电商罗盘大屏</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {listeningSource === 'control'
                ? '中控台监听只能获取评论消息'
                : '大屏监听可以获取评论、点赞、进入直播间等全部消息类型'}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="hide-username"
                checked={config.hideUsername}
                onCheckedChange={checked =>
                  updateGeneralSettings({ hideUsername: checked })
                }
              />
              <Label htmlFor="hide-username">隐藏用户名</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              系统会自动将
              <span className="font-bold mx-1 bg-muted px-1 rounded-md">
                {'{用户名}'}
              </span>
              替换为实际的用户名称，如果设置隐藏用户名，只会保留用户名的第一个字符。
              <br />
              未设置隐藏用户名时：{' '}
              <span className="font-bold mx-1 bg-muted px-1 rounded-md">
                {'{用户名}'}
              </span>{' '}
              {'->'}{' '}
              <span className="font-bold mx-1 bg-muted px-1 rounded-md">
                张三
              </span>
              <br />
              设置隐藏用户名时：{' '}
              <span className="font-bold mx-1 bg-muted px-1 rounded-md">
                {'{用户名}'}
              </span>{' '}
              {'->'}{' '}
              <span className="font-bold mx-1 bg-muted px-1 rounded-md">
                张***
              </span>
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <Tabs defaultValue="keyword">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">自动回复评论设置</h3>
                <TabsList>
                  <TabsTrigger value="keyword">关键词回复</TabsTrigger>
                  <TabsTrigger value="ai">AI回复</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="keyword" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="keyword-reply"
                    checked={keywordReplyEnabled}
                    onCheckedChange={handleKeywordEnabledChange}
                  />
                  <Label htmlFor="keyword-reply">启用关键词回复</Label>
                </div>

                {keywordReplyEnabled && (
                  <Card className="border-dashed">
                    <CardContent className="pt-4">
                      <KeywordReplyManager />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <AIAutoReplyConfig />
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {listeningSource === 'compass' && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">其他自动回复</h3>

                <div className="space-y-6">
                  {autoReplyTypes.map(type => (
                    <div key={type.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-medium">
                            {type.name}自动回复
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            当用户
                            {type.name}
                            时自动回复
                          </p>
                        </div>
                        <Switch
                          checked={typeReplies[type.id]?.enable || false}
                          onCheckedChange={checked =>
                            handleReplyChange(type.id, checked)
                          }
                          disabled={listeningSource !== 'compass'}
                        />
                      </div>

                      {typeReplies[type.id]?.enable && (
                        <Card className="border-dashed">
                          <CardContent className="pt-4">
                            <ReplyMessageManager
                              title={`${type.name}回复消息`}
                              description="系统将从以下消息中随机选择一条发送，可使用{用户名}变量"
                              messages={
                                typeReplies[type.id]?.messages || [type.default]
                              }
                              onAdd={message =>
                                handleMessageAdd(type.id, message)
                              }
                              onRemove={index =>
                                handleMessageRemove(type.id, index)
                              }
                              placeholder={`例如：${type.default}`}
                              msgType={type.id}
                            />
                            {
                              // 单独处理已下单、已支付的回复
                              type.id === 'live_order' && (
                                <>
                                  <Separator className="mt-4" />
                                  <div className="flex justify-between items-center pt-4 text-sm">
                                    <div className="flex flex-col">
                                      <span>仅在已支付时回复</span>
                                      <span className="text-muted-foreground">
                                        用户订单具有<strong>已下单</strong>和
                                        <strong>已支付</strong>两种状态
                                      </span>
                                    </div>
                                    <Switch
                                      checked={
                                        config[type.id]?.options?.onlyReplyPaid
                                      }
                                      onCheckedChange={e =>
                                        hanldeOptionsChange(type.id, {
                                          onlyReplyPaid: e,
                                        })
                                      }
                                    />
                                  </div>
                                </>
                              )
                            }
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
            </>
          )}

          <BlocklistManager />

          <Separator />

          <div className="flex flex-col space-y-1">
            <div className="flex justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hide-username"
                  checked={!!config.ws?.enable}
                  onCheckedChange={checked =>
                    updateWSConfig({ enable: checked })
                  }
                />
                <Label htmlFor="hide-username">启用 WebSocket 服务</Label>
              </div>
              <div className="flex space-x-1 items-center">
                <Label>端口号：</Label>
                <ValidatedNumberInput
                  disabled={!config.ws?.enable}
                  className="w-24"
                  type="number"
                  placeholder="12354"
                  min={2000}
                  max={65535}
                  value={config.ws?.port ?? 12354}
                  onCommit={value => updateWSConfig({ port: value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              启用时，点击「开始监听」按钮后将同步启动本地 WebSocket
              服务端，当有新的评论信息时会同步向客户端发送 JSON 格式的信息。
              <br />
              可以通过 WebSocket 客户端连接
              <span className="border p-0.5 px-1 rounded-md mx-1">
                ws://localhost:{config.ws?.port}
              </span>
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-muted-foreground">设置会自动保存</p>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              返回
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

const KeywordReplyManager = () => {
  const { config, updateKeywordRules } = useAutoReply()

  // 复制规则以便在本地编辑
  // const [rules, setRules] = useState(config.comment.keywordReply.rules)
  const rules = config.comment.keywordReply.rules

  // 保存所有规则
  const saveRules = useMemoizedFn((rulesToSave = rules) => {
    updateKeywordRules(rulesToSave)
  })

  const updateRuleNestedArray = useMemoizedFn(
    (
      ruleIndex: number,
      key: 'keywords' | 'contents',
      updateFn: (currentArray: string[]) => string[], // 函数接收当前数组，返回新数组
    ) => {
      const newRules = rules.map((rule, index) => {
        if (index === ruleIndex) {
          const currentArray = rule[key]
          const newArray = updateFn(currentArray)
          return {
            ...rule,
            [key]: newArray, // 使用计算属性名
          }
        }
        return rule
      })

      saveRules(newRules)
    },
  ) // rules 和 saveRules 是依赖项

  // 添加新规则
  const addRule = () => {
    saveRules([...rules, { keywords: [], contents: [] }])
  }

  // 删除规则
  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index)
    saveRules(newRules)
  }

  // 添加关键词
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

  // 移除关键词
  const removeKeyword = useCallback(
    (ruleIndex: number, keywordIndex: number) => {
      updateRuleNestedArray(ruleIndex, 'keywords', currentKeywords =>
        currentKeywords.filter((_, kIdx) => kIdx !== keywordIndex),
      )
    },
    [updateRuleNestedArray],
  )

  // 添加回复内容
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

  // 移除回复内容
  const removeContent = useCallback(
    (ruleIndex: number, contentIndex: number) => {
      updateRuleNestedArray(ruleIndex, 'contents', currentContents =>
        currentContents.filter((_, cIdx) => cIdx !== contentIndex),
      )
    },
    [updateRuleNestedArray],
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">关键词回复规则</h3>
        <Button size="sm" onClick={addRule} className="flex items-center gap-1">
          <Plus className="h-4 w-4" /> 添加规则
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">
            暂无规则，请点击"添加规则"创建
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, ruleIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <Card key={ruleIndex} className="border-dashed">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  规则 {ruleIndex + 1}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(ruleIndex)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 关键词列表 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">关键词</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {rule.keywords.map((keyword, keywordIndex) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
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
                        const input = e.currentTarget
                          .previousSibling as HTMLInputElement
                        addKeyword(ruleIndex, input.value)
                        input.value = ''
                      }}
                    >
                      添加
                    </Button>
                  </div>
                </div>

                {/* 回复内容列表 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">回复内容</h4>
                  <div className="space-y-2 mb-2">
                    {rule.contents.map((content, contentIndex) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
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
                        const input = e.currentTarget
                          .previousSibling as HTMLInputElement
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
      )}

      {/* {rules.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => saveRules()}
            className="flex items-center gap-1"
          >
            <Save className="h-4 w-4" /> 保存规则
          </Button>
        </div>
      )} */}
    </div>
  )
}

const AIAutoReplyConfig = () => {
  const { config, updateAIReplySettings } = useAutoReply()
  const aiReplyEnabled = config.comment.aiReply.enable
  const autoSend = config.comment.aiReply.autoSend
  // 处理AI自动回复开关
  const handleAiReplyChange = (checked: boolean) => {
    updateAIReplySettings({ enable: checked })
  }

  const handleAutoSendChange = (checked: boolean) => {
    updateAIReplySettings({ autoSend: checked })
  }

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="ai-reply"
            checked={aiReplyEnabled}
            onCheckedChange={handleAiReplyChange}
          />
          <Label htmlFor="ai-reply">启用AI自动回复</Label>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-send"
              checked={autoSend}
              onCheckedChange={handleAutoSendChange}
            />
            <Label htmlFor="auto-send">自动发送</Label>
          </div>
          <div className="text-xs text-muted-foreground mt-2 pl-2">
            <p>
              请注意：开启自动发送后，AI生成的所有回复都会自动发送到直播间，这可能会带来以下
              <strong>风险</strong>：
            </p>
            <ul className="list-disc pl-6 mt-1">
              <li>
                AI可能会生成<strong>不恰当或不相关</strong>的回复
              </li>
              <li>
                回复内容可能会<strong>违反平台规则</strong>
              </li>
              <li>可能会影响与观众的真实互动体验</li>
            </ul>
            <p className="font-medium mt-1">
              ※
              建议在开启自动发送前，先观察一段时间AI的回复质量。您也可以通过点击每条回复预览旁边的
              <strong>小飞机按钮</strong>来手动发送。
            </p>
          </div>
        </div>
      </div>
      {aiReplyEnabled && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">提示词配置</div>
          <Textarea
            placeholder="输入AI提示词..."
            value={config.comment.aiReply.prompt}
            onChange={e => updateAIReplySettings({ prompt: e.target.value })}
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            提示词将指导AI如何回复用户评论
          </p>
          <div className="flex justify-between items-center space-x-2">
            <APIKeyDialog />
            <AIModelInfo />
          </div>
        </div>
      )}
    </>
  )
}
export default Settings
