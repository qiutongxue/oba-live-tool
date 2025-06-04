# Changelog

## v1.5.6

[compare changes](https://github.com/TLS-802/TLS-live-tool/compare/v1.5.5...v1.5.6)

### 🚀 Features
- 新增 WebSocketService 类以支持 WebSocket 服务。
- 重构自动回复管理器，支持通过 WebSocket 发送评论信息。
- 移除 autoReplyPlus 相关代码，简化自动回复逻辑。
- 更新 IPC 通道以适应新的自动回复配置。
- 添加配置选项以启用或禁用 WebSocket 服务及其端口设置。


## v1.5.6

[compare changes](https://github.com/qiutongxue/oba-live-tool/compare/v1.5.5...v1.5.6)

### 🚀 Features

- **自动回复:** 添加 WebSocket 服务支持 ([46509f0](https://github.com/qiutongxue/oba-live-tool/commit/46509f0))

### 🐞 Bug Fixes

- **自动发言:** 修复小红书平台无法正常发送评论的问题 ([6bb4b71](https://github.com/qiutongxue/oba-live-tool/commit/6bb4b71))
- **中控台:** 增加小红书连接中控台的容错 ([932640f](https://github.com/qiutongxue/oba-live-tool/commit/932640f))
- **中控台:** 优化连接中控台时的提示内容 ([e5f226f](https://github.com/qiutongxue/oba-live-tool/commit/e5f226f))

## v1.5.5

[compare changes](https://github.com/TLS-802/TLS-live-tool/compare/v1.5.4...v1.5.5)

### 🚀 Features
- 自动回复: 添加了过滤器，可以设置满足过滤器条件时的回复信息
### 🐞 Bug Fixes
- 自动回复: 修复了自动回复的设置在不同账号间切换导致的异常问题
