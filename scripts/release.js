import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { x } from 'tinyexec'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(__dirname, '../package.json')

const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
const version = pkg.version

const commitMessage = `chore: release v${version}`

async function gitCommit() {
  await x('git', ['add', 'CHANGELOG.md', 'package.json'], {
    throwOnError: true,
  })
  await x('git', ['commit', '-m', commitMessage], { throwOnError: true })
}

async function gitTag() {
  const tagName = `v${version}`
  await x('git', ['tag', '--annotate', '--message', commitMessage, tagName], {
    throwOnError: true,
  })
}

async function gitPush() {
  await x('git', ['push', '--follow-tags'], { throwOnError: true })
}

gitCommit()
  .then(() => gitTag())
  .then(() => gitPush())
  .catch(err => {
    console.error(err)
  })
