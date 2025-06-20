# Changelog


## v1.5.7

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.6...v1.5.7)

### 🚀 Features

- **ui:** API Key 输入栏添加隐藏/显示功能 ([66269aa](https://github.com/qiutongxue/oba-live-tool/commit/66269aa))

### 🐞 Bug Fixes

- **ui:** 修复火山引擎配置中可能会造成歧义的信息 ([10f65f3](https://github.com/qiutongxue/oba-live-tool/commit/10f65f3))
- **ai:** 修复 API Key 测试连接的部分问题 ([47a147a](https://github.com/qiutongxue/oba-live-tool/commit/47a147a))
- **中控台:** 修复视频号无法登录的问题 fix #149 ([#149](https://github.com/qiutongxue/oba-live-tool/issues/149))

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
