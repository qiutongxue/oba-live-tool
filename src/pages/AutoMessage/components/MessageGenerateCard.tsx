import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useAutoMessageActions,
  useCurrentAutoMessage,
} from '@/hooks/useAutoMessage'
import { PlusIcon, PlayIcon, PauseIcon } from 'lucide-react'
import { useMemoizedFn } from 'ahooks'
import React, { useRef, useState } from 'react'

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';




const MessageGenerateCard = React.memo(() => {
  const messages = useCurrentAutoMessage(context => context.config.messages)
  const content = useCurrentAutoMessage(context => context.config.baseContent)
  const { generateMessages, setBaseContent } = useAutoMessageActions()

  const handleGenerateMessage = useMemoizedFn(() => {
    generateMessages(content)
  })
  const handleConentChange = useMemoizedFn((content: string) => {
    setBaseContent(content)
  })

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [baseUrl, setBaseUrl]  = useState('')
  const handleCanPlay = () => {
    console.log('Audio can play'); 
    audioRef.current.play().catch((error: any) => {
      console.error("Error playing sound:", error);
    });
  }
  const handlePlayMessage = useMemoizedFn(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }else {
        setIsPlaying(true);
        handlePlay();
      }      
    }
  })
  const handleEnded = () => {
    console.log('Audio playback ended');
    setIsPlaying(false);
    // 你可以在这里执行其他操作，比如重置状态或播放下一个音频
    handlePlay();
  };


  const handlePlay = () => {
    const msg = messages[Math.floor(Math.random() * messages.length) | 0];
    console.log(msg.content)
    if (msg.content) {
     
      // const message = encodeURIComponent(encodeURIComponent(msg.content));
      // const token = '24.a293110535224457c9d350ff61ba0f24.2592000.1745336561.282335-31266064';//百度token（需要后端获取）
      // const param = '&lan=zh&cuid=123&ctp=1&tok=' + token;
      // setBaseUrl('http://tsn.baidu.com/text2audio?tex=' + message + param);
      // audioRef.current.load();

      
      
    } 
  }
  
  

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>参考话术</Label>
              <p className="text-sm text-muted-foreground">
                添加需要自动播报的内容
              </p>
            </div>
          </div>         
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={e => handleConentChange(e.target.value)}
              className="resize-none flex-1 min-h-[56px] max-h-[200px] bg-muted/50 focus:bg-background transition-colors"
              rows={3}
            />
          </div>
          <div className="space-y-0">
            <Button variant="outline" size="sm" onClick={handleGenerateMessage}>
              <PlusIcon className="mr-2 h-4 w-4" />
              自动生成
            </Button>
            <Button variant="outline" size="sm" onClick={handlePlayMessage} >
            {isPlaying ? <PauseIcon width="18" height="18" /> : <PlayIcon width="18" height="18" />}
              
            </Button>
          </div>
          <audio ref={audioRef} src={baseUrl} preload="auto" onEnded={handleEnded} onCanPlay={handleCanPlay} className="hidden"/>
        </div>
      </CardContent>
    </Card>
  )
})

export default MessageGenerateCard
