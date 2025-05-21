import { version } from './package.json'

const config = {
  types: {
    feat: {
      title: '🚀 Features',
    },
    fix: {
      title: '🐞 Bug Fixes',
    },
    refactor: false,
    docs: false,
    chore: false,
    style: false,
    types: false,
    build: false,
    test: false,
    ci: false,
  },
  output: 'CHANGELOG.md',
  noAuthors: true,
  newVersion: version,
}

export default config
