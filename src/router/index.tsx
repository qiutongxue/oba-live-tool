import { createHashRouter } from 'react-router'
import AIChat from '@/pages/AIChat'
import AutoMessage from '@/pages/AutoMessage'
import AutoPopUp from '@/pages/AutoPopUp'
import AutoReply from '@/pages/AutoReply'
import AutoReplySettings from '@/pages/AutoReply/AutoReplySettings'
import LiveControl from '@/pages/LiveControl'
import Marketing from '@/pages/Marketing'
import RedPacket from '@/pages/RedPacket'
import Seckill from '@/pages/Seckill'
import SeckillFloat from '@/pages/Seckill/Float'
import Settings from '@/pages/SettingsPage'
import App from '../App'

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <LiveControl />,
      },
      {
        path: '/auto-message',
        element: <AutoMessage />,
      },
      {
        path: '/auto-popup',
        element: <AutoPopUp />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
      {
        path: '/ai-chat',
        element: <AIChat />,
      },
      {
        path: 'auto-reply',
        element: <AutoReply />,
      },
      {
        path: '/auto-reply/settings',
        element: <AutoReplySettings />,
      },
      {
        path: '/red-packet',
        element: <RedPacket />,
      },
      {
        path: '/marketing',
        element: <Marketing />,
      },
      {
        path: '/seckill',
        element: <Seckill />,
      },
    ],
  },
  {
    // 秒杀补货悬浮窗：独立的无边框窗口，不要放进 App 布局（否则会带侧边栏）
    path: '/seckill-float',
    element: <SeckillFloat />,
  },
])
