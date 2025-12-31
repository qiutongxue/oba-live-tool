import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(__dirname, '../package.json')

const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
const version = pkg.version

const changelogPath = resolve(__dirname, '../CHANGELOG.md')
const content = await readFile(changelogPath, 'utf-8')

const currentVersion = `v${version}`

// 匹配当前版本标题
const regex = new RegExp(`##\\s+${currentVersion.replace('.', '\\.')}(.*?)##\\s+v`, 's')
const match = content.match(regex)

if (match) {
  console.log(match[1].trim())
} else {
  // 如果是最后一节（没有下一个版本）
  const fallbackRegex = new RegExp(`##\\s+${currentVersion.replace('.', '\\.')}(.*)`, 's')
  const fallback = content.match(fallbackRegex)
  console.log(fallback?.[1]?.trim() || 'No changelog found for this version.')
}
