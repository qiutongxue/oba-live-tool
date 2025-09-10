# Changelog


## v1.5.12-beta.1

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.11...v1.5.12-beta.1)

### 🚀 Features

- 添加更新自动评论配置（主进程） ([1ad858d](https://github.com/qiutongxue/oba-live-tool/commit/1ad858d))
- 增加中断控制 ([72fd5a4](https://github.com/qiutongxue/oba-live-tool/commit/72fd5a4))
- 主线程监听评论失败时通知渲染层 ([2841969](https://github.com/qiutongxue/oba-live-tool/commit/2841969))

### 🐞 Bug Fixes

- 修复部分类型错误以及遗留问题 ([c000776](https://github.com/qiutongxue/oba-live-tool/commit/c000776))
- 修复ipc传参缺失 accountId 的问题 ([3e7135c](https://github.com/qiutongxue/oba-live-tool/commit/3e7135c))
- 修复更新配置时计时器未重置的问题 ([12150cb](https://github.com/qiutongxue/oba-live-tool/commit/12150cb))
- 进一步补充连接中控台的功能 ([bc8f622](https://github.com/qiutongxue/oba-live-tool/commit/bc8f622))
- 优化一键发送时的日志提示内容 ([081cf3d](https://github.com/qiutongxue/oba-live-tool/commit/081cf3d))
- 修复定时任务的部分错误 ([a214d0d](https://github.com/qiutongxue/oba-live-tool/commit/a214d0d))
- 修复中控台连接中断时的部分错误 ([ae3b7d0](https://github.com/qiutongxue/oba-live-tool/commit/ae3b7d0))
- 修复无头模式登录报错的问题 ([89396de](https://github.com/qiutongxue/oba-live-tool/commit/89396de))

## v1.5.11

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.10...v1.5.11)

### 🐞 Bug Fixes

- **中控台:** 修复抖音小店&小红书打开新页面可能造成的问题 ([dc00ebb](https://github.com/qiutongxue/oba-live-tool/commit/dc00ebb))
- **中控台:** 修复巨量百应登录页面样式错误的问题 ([f184e34](https://github.com/qiutongxue/oba-live-tool/commit/f184e34))

## v1.5.10

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.9...v1.5.10)

### 🚀 Features

- **自动发言:** 优化自动发言的消息编辑界面 ([6424ef0](https://github.com/qiutongxue/oba-live-tool/commit/6424ef0))
- **自动回复:** 添加关键字回复的批量编辑功能 ([7a27d9c](https://github.com/qiutongxue/oba-live-tool/commit/7a27d9c))
- **自动发言&自动回复:** 支持在文本中使用形如 {选项A/选项B/选项C} 的变量 ([499d973](https://github.com/qiutongxue/oba-live-tool/commit/499d973))
- **中控台:** 添加无头模式开关 ([94587c3](https://github.com/qiutongxue/oba-live-tool/commit/94587c3))

### 🐞 Bug Fixes

- 修复抖音小店登录页面样式混乱的问题, fix #158 ([#158](https://github.com/qiutongxue/oba-live-tool/issues/158))

## v1.5.9

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.8...v1.5.9)

### 🐞 Bug Fixes

- 修复登录控制台成功以后页面状态更新问题, fix #154 ([#154](https://github.com/qiutongxue/oba-live-tool/issues/154))

## v1.5.8

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.7...v1.5.8)

### 🚀 Features

- 新增对淘宝直播平台的支持 ([30a7623](https://github.com/qiutongxue/oba-live-tool/commit/30a7623))
- **ui:** 添加连接到淘宝中控台时的提示 ([9ad7645](https://github.com/qiutongxue/oba-live-tool/commit/9ad7645))
- **中控台:** 连接中控台失败时自动关闭浏览器 ([996181f](https://github.com/qiutongxue/oba-live-tool/commit/996181f))

### 🐞 Bug Fixes

- **中控台:** 修复未直播状态下登录淘宝平台后错误提示异常问题 ([8f89ed2](https://github.com/qiutongxue/oba-live-tool/commit/8f89ed2))
- **中控台:** 优化登录逻辑，只要登录成功就保存登录状态 ([f888042](https://github.com/qiutongxue/oba-live-tool/commit/f888042))
- 修复账号管理的部分问题 ([887fa19](https://github.com/qiutongxue/oba-live-tool/commit/887fa19))
- 优化删除账号的逻辑 ([991a77f](https://github.com/qiutongxue/oba-live-tool/commit/991a77f))
- **ui:** 修复在中控台连接中切换到其它页面后连接状态失效的问题 ([75a254e](https://github.com/qiutongxue/oba-live-tool/commit/75a254e))
- 修复中控台连接失败后自动断开连接有延时的问题 ([01813fc](https://github.com/qiutongxue/oba-live-tool/commit/01813fc))

## v1.5.7

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.6...v1.5.7)

### 🚀 Features

- **ui:** API Key 输入栏添加隐藏/显示功能 ([66269aa](https://github.com/qiutongxue/oba-live-tool/commit/66269aa))

### 🐞 Bug Fixes

- **ui:** 修复火山引擎配置中可能会造成歧义的信息 ([10f65f3](https://github.com/qiutongxue/oba-live-tool/commit/10f65f3))
- **ai:** 修复 API Key 测试连接的部分问题 ([47a147a](https://github.com/qiutongxue/oba-live-tool/commit/47a147a))
- **中控台:** 修复视频号无法登录的问题 fix #149 ([#149](https://github.com/qiutongxue/oba-live-tool/issues/149))

## v1.5.6

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.5...v1.5.6)

### 🚀 Features

- **自动回复:** 添加 WebSocket 服务支持 ([46509f0](https://github.com/qiutongxue/oba-live-tool/commit/46509f0))

### 🐞 Bug Fixes

- **自动发言:** 修复小红书平台无法正常发送评论的问题 ([6bb4b71](https://github.com/qiutongxue/oba-live-tool/commit/6bb4b71))
- **中控台:** 增加小红书连接中控台的容错 ([932640f](https://github.com/qiutongxue/oba-live-tool/commit/932640f))
- **中控台:** 优化连接中控台时的提示内容 ([e5f226f](https://github.com/qiutongxue/oba-live-tool/commit/e5f226f))

## v1.5.5

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.4...v1.5.5)

### 🚀 Features

- **自动回复:** 添加了过滤器，可以设置满足过滤器条件时的回复信息 ([#130](https://github.com/qiutongxue/oba-live-tool/pull/130))

### 🐞 Bug Fixes

- **自动回复:** 修复了自动回复的设置在不同账号间切换导致的异常问题

## v1.5.4

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.3...v1.5.4)

### 🚀 Features

- 新增快手小店登录 ([fb7d842](https://github.com/qiutongxue/oba-live-tool/commit/fb7d842))
- 新增快手小店的自动弹窗和自动发言 ([4bed9d7](https://github.com/qiutongxue/oba-live-tool/commit/4bed9d7))
- **自动回复:** 添加新设置-当订单已支付时才自动回复, fix #118 ([#118](https://github.com/qiutongxue/oba-live-tool/issues/118))
- **更新器:** 显示新版本的更新内容 #31 ([#31](https://github.com/qiutongxue/oba-live-tool/issues/31))

### 🐞 Bug Fixes

- 修复部分错误无法被正确捕捉的问题 ([c08c1e0](https://github.com/qiutongxue/oba-live-tool/commit/c08c1e0))
- **自动发言:** 降低随机空格中空格出现的概率，随机发送时不和上一条重复, fix #120 ([#120](https://github.com/qiutongxue/oba-live-tool/issues/120))

