---

name: 🐞 报告！有BUG！
about: 遇到BUG了？请在此处提供你遇到的BUG问题
title: "[Bug] <这是你的标题>"
labels: bug
body:
  - type: textarea
    id: describe
    attributes:
      label: 问题描述
      description: 请尽量详细地描述你遇到的问题
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: 应用版本号
      description: |
        可在应用的标题栏查看当前版本，或前往「应用设置」-「软件更新」找到当前版本号
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: 日志文件
      description: |
        「应用设置」-「其它设置」-「打开日志文件」即可找到 main.log 文件
        可将 main.log 文件直接拖进下方的文本框中，或者仅复制必要的文本内容
---
