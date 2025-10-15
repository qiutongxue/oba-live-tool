
## v1.5.12

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.11...v1.5.12)

### 🚀 Features

- 新增小红书蒲公英平台 ([0e7bf11](https://github.com/qiutongxue/oba-live-tool/commit/0e7bf11))

### 🐞 Bug Fixes

- **小红书千帆:** 修复小红书千帆自动弹窗无效的问题 ([3ce60c5](https://github.com/qiutongxue/oba-live-tool/commit/3ce60c5))
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

### 🚀 Features

- **自动发言:** 优化自动发言的消息编辑界面
- **自动回复:** 添加关键字回复的批量编辑功能
- **自动发言&自动回复:** 支持在文本中使用形如 {选项A/选项B/选项C} 的变量
- **中控台:** 添加无头模式开关

### 🐞 Bug Fixes

- 修复抖音小店登录页面样式混乱的问题


## v1.5.9

### 🐞 Bug Fixes

- 修复登录控制台成功以后页面状态更新问题


## v1.5.8

### 🚀 Features

- 新增对淘宝直播平台的支持
- **ui:** 添加连接到淘宝中控台时的提示
- **中控台:** 连接中控台失败时自动关闭浏览器

### 🐞 Bug Fixes

- **中控台:** 修复未直播状态下登录淘宝平台后错误提示异常问题
- **中控台:** 优化登录逻辑，只要登录成功就保存登录状态
- 修复账号管理的部分问题
- 优化删除账号的逻辑
- **ui:** 修复在中控台连接中切换到其它页面后连接状态失效的问题
- 修复中控台连接失败后自动断开连接有延时的问题


## v1.5.7

### 🚀 Features

- **ui:** API Key 输入栏添加隐藏/显示功能

### 🐞 Bug Fixes

- **ui:** 修复火山引擎配置中可能会造成歧义的信息
- **ai:** 修复 API Key 测试连接的部分问题
- **中控台:** 修复视频号无法登录的问题


## v1.5.6

### 🚀 Features

- **自动回复:** 添加 WebSocket 服务支持

### 🐞 Bug Fixes

- **自动发言:** 修复小红书平台无法正常发送评论的问题
- **中控台:** 增加小红书连接中控台的容错
- **中控台:** 优化连接中控台时的提示内容


## v1.5.5

### 🚀 Features
- 自动回复: 添加了过滤器，可以设置满足过滤器条件时的回复信息
### 🐞 Bug Fixes
- 自动回复: 修复了自动回复的设置在不同账号间切换导致的异常问题


## v1.5.4

### 🚀 Features

- 新增快手小店登录
- 新增快手小店的自动弹窗和自动发言
- **自动回复:** 添加新设置-当订单已支付时才自动回复
- **更新器:** 显示新版本的更新内容

### 🐞 Bug Fixes

- 修复部分错误无法被正确捕捉的问题
- **自动发言:** 降低随机空格中空格出现的概率，随机发送时不和上一条重复
