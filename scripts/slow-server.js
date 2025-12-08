import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.join(fileURLToPath(import.meta.url), '..', '..')

const PORT = 8080
const DIR = path.join(__dirname, 'release', '2.0.0') // 指向打包目录
const SPEED = 10 * 1024 * 1024 // 限制速度：1MB/s

const server = http.createServer(async (req, res) => {
  let targetFile = req.url
  console.log(req.url)
  if (req.url.includes('https://github.com')) {
    targetFile = req.url.split('/').pop()
  }
  const filePath = path.join(DIR, targetFile)
  console.log(filePath)
  if (!fs.existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }

  const stat = fs.statSync(filePath)
  const totalSize = stat.size

  // 1. 如果是 .yml 文件，直接快速返回 (不然检查更新阶段会超时)
  if (req.url.endsWith('.yml') || req.url.endsWith('.json')) {
    res.writeHead(200, {
      'Content-Type': 'application/x-yaml',
      'Content-Length': totalSize,
    })
    fs.createReadStream(filePath).pipe(res)
    console.log(`快速发送配置: ${req.url}`)
    return
  }

  // 2. 如果是安装包 (.exe, .dmg, .zip)，开始龟速发送
  console.log(`开始龟速发送文件: ${req.url} (总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB)`)

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': totalSize,
  })

  const fd = fs.openSync(filePath, 'r')
  let position = 0
  const chunkSize = SPEED / 10 // 每次发送 0.1秒 的量

  // 使用定时器模拟低网速
  const timer = setInterval(() => {
    const buffer = Buffer.alloc(chunkSize)
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position)

    if (bytesRead === 0) {
      clearInterval(timer)
      fs.closeSync(fd)
      res.end()
      console.log('发送完成')
      return
    }

    position += bytesRead
    // 只发送实际读取到的字节
    res.write(buffer.subarray(0, bytesRead))

    // 计算当前进度
    const percent = ((position / totalSize) * 100).toFixed(0)
    process.stdout.write(`\r进度: ${percent}%`)
  }, 100) // 每 100ms 发送一次数据

  // 处理客户端断开连接
  req.on('close', () => {
    clearInterval(timer)
    try {
      fs.closeSync(fd)
    } catch {}
  })
})

server.listen(PORT, () => {
  console.log(`龟速服务器已启动: http://localhost:${PORT}`)
  console.log(`目标目录: ${DIR}`)
})
