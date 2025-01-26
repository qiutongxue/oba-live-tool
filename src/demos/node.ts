import { lstat } from 'node:fs/promises'
import { cwd } from 'node:process'

lstat(cwd()).then((stats) => {
  // eslint-disable-next-line no-console
  console.log('[fs.lstat]', stats)
}).catch((err) => {
  console.error(err)
})
