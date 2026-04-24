import { OpenAI } from 'openai'
import 'dotenv/config'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROVIDERS_JSON_PATH = resolve(__dirname, '../providers.json')

async function fetchDeepseekModels(baseURL) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.error('未找到 DeepSeek 的 API KEY')
    return
  }
  const openai = new OpenAI({ baseURL, apiKey })
  const models = await openai.models.list()
  const filteredModels = models.data.map(model => model.id)
  console.log(`DeepSeek: 获取到 ${filteredModels.length} 个模型`)
  return filteredModels
}

async function fetchOpenrouterModels(baseURL) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error('未找到 OpenRouter 的 API KEY')
    return
  }
  const openai = new OpenAI({ baseURL, apiKey })
  const models = await openai.models.list()
  const filteredModels = models.data
    .filter(model => {
      return (
        model.architecture.modality === 'text->text' && model.id.toLowerCase().includes('deepseek')
      )
    })
    .map(model => model.id)
  console.log(`OpenRouter: 获取到 ${filteredModels.length} 个模型`)
  return filteredModels
}

async function fetchSiliconflowModels(baseURL) {
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey) {
    console.error('未找到硅基流动的 API KEY')
    return
  }
  const openai = new OpenAI({ baseURL, apiKey })
  const models = await openai.models.list()
  const filteredModels = models.data
    .filter(model => model.id.toLowerCase().includes('deepseek'))
    .map(model => model.id)
  console.log(`硅基流动: 获取到 ${filteredModels.length} 个模型`)
  return filteredModels
}

const updaters = [
  { key: 'deepseek', fetch: fetchDeepseekModels, envVar: 'DEEPSEEK_API_KEY' },
  { key: 'openrouter', fetch: fetchOpenrouterModels, envVar: 'OPENROUTER_API_KEY' },
  { key: 'siliconflow', fetch: fetchSiliconflowModels, envVar: 'SILICONFLOW_API_KEY' },
]

async function main() {
  // 1. 读取当前 providers.json
  console.log('读取 providers.json...')
  const raw = await readFile(PROVIDERS_JSON_PATH, 'utf-8')
  const current = JSON.parse(raw)

  // 2. 遍历抓取各平台最新模型列表
  for (const { key, fetch, envVar } of updaters) {
    if (process.env[envVar] && current[key]) {
      const models = await fetch(current[key].baseURL)
      if (models) {
        current[key].models = models
      }
    }
  }

  // 3. 写回 providers.json
  await writeFile(PROVIDERS_JSON_PATH, JSON.stringify(current, null, 2) + '\n')
  console.log('✅ providers.json 已更新')
}

main().catch(error => {
  console.error('更新失败:', error)
  process.exit(1)
})
