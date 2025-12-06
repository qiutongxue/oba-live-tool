import { PopoverClose } from '@radix-ui/react-popover'
import pick from 'lodash-es/pick'
import { FilterIcon, FunnelPlusIcon, PlusIcon, Trash2Icon, X, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { EventMessageType, MessageOf } from '@/hooks/useAutoReply'
import { type SimpleEventReplyMessage, useAutoReplyConfig } from '@/hooks/useAutoReplyConfig'
import { useToast } from '@/hooks/useToast'
import type { StringFilter, StringFilterConfig } from '@/utils/filter'

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

export function CompassSetting() {
  const { config, updateEventReplyEnabled, updateEventReplyContents, updateEventReplyOptions } =
    useAutoReplyConfig()
  const { entry: listeningSource } = config
  const typeReplies = pick(config, [
    'room_enter',
    'room_like',
    'room_follow',
    'subscribe_merchant_brand_vip',
    'live_order',
    'ecom_fansclub_participate',
  ])

  // 自动回复消息的开关
  const handleReplyChange = (type: EventMessageType, checked: boolean) => {
    updateEventReplyEnabled(type, checked)
  }

  // 处理其余消息的回复内容
  const handleMessageAdd = (type: EventMessageType, message: SimpleEventReplyMessage) => {
    updateEventReplyContents(type, [...typeReplies[type].messages, message])
  }

  const hanldeOptionsChange = (type: EventMessageType, options: Record<string, boolean>) => {
    updateEventReplyOptions(type, options)
  }

  const handleMessageRemove = (type: EventMessageType, index: number) => {
    const newMessages = typeReplies[type].messages.filter((_, i) => i !== index)
    updateEventReplyContents(type, newMessages)
  }
  return (
    <div className="space-y-6">
      {autoReplyTypes.map(type => (
        <div key={type.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium">{type.name}自动回复</h4>
              <p className="text-xs text-muted-foreground">
                当用户
                {type.name}
                时自动回复
              </p>
            </div>
            <Switch
              checked={typeReplies[type.id]?.enable || false}
              onCheckedChange={checked => handleReplyChange(type.id, checked)}
              disabled={listeningSource !== 'compass'}
            />
          </div>

          {typeReplies[type.id]?.enable && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <ReplyMessageManager
                  title={`${type.name}回复消息`}
                  description="系统将从以下消息中随机选择一条发送，可使用{用户名}变量"
                  messages={typeReplies[type.id]?.messages || [type.default]}
                  onAdd={message => handleMessageAdd(type.id, message)}
                  onRemove={index => handleMessageRemove(type.id, index)}
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
                            用户订单具有<strong>已下单</strong>和<strong>已支付</strong>
                            两种状态
                          </span>
                        </div>
                        <Switch
                          checked={config[type.id]?.options?.onlyReplyPaid}
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
  )
}

// 用于管理回复消息的组件
function ReplyMessageManager({
  title,
  description,
  messages,
  onAdd,
  onRemove,
  placeholder,
  msgType,
}: {
  title: string
  description?: string
  messages: SimpleEventReplyMessage[]
  onAdd: (message: SimpleEventReplyMessage) => void
  onRemove: (index: number) => void
  placeholder?: string
  msgType: EventMessageType
}) {
  const defaultFilterForm = () => ({
    type: 'eq' as const,
    field: 'nick_name' as const,
    content: [],
  })
  const [newMessage, setNewMessage] = useState('')
  const [filterForm, setFilterForm] = useState<MessageFilterForm<typeof msgType>>(
    defaultFilterForm(),
  )
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

  const handleFilterFormChange = (newForm: MessageFilterForm<typeof msgType>) => {
    setFilterForm(newForm)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
        {messages.length === 0 ? (
          <div className="text-sm text-center py-4 text-muted-foreground">暂无消息</div>
        ) : (
          messages.map((message, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 下标无妨
            <div key={index} className="flex items-center gap-2 group">
              <div className="flex-1 text-sm p-2 rounded bg-muted/50 flex justify-between">
                <span>{typeof message === 'string' ? message : message.content}</span>
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

function FilterText({ filterConfig }: { filterConfig: StringFilterConfig }) {
  const renderCondition = (field: keyof typeof fieldNameMap, condition: StringFilter) => {
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
        <Button variant="ghost" className="w-4" onClick={() => setOpen(prev => !prev)}>
          <FunnelPlusIcon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="">
          <div className="text-sm">过滤器</div>
          <p className="text-sm text-muted-foreground">仅回复过滤器命中的条件</p>
        </div>
        <div className="grid grid-cols-4 gap-x-1 pt-2">
          <div className="col-span-4 flex flex-col space-y-2">
            <div className="flex space-x-1">
              <Select value={filterForm.field as string} onValueChange={handleFilterFieldChange}>
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
              <Select value={filterForm.type as string} onValueChange={handleFilterTypeChange}>
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
                <Button variant="ghost" onClick={() => handleFilterContentRemove(i)}>
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
