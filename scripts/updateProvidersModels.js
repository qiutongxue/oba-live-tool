import { OpenAI } from 'openai'
import 'dotenv/config'
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { providers } from '../shared/providers'

const __dirname = dirname(fileURLToPath(import.meta.url))
const providerPath = resolve(__dirname, '../shared/providers.ts')

async function fetchOpenrouterModels() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error('未找到 OpenRouter 的 API KEY')
    return
  }
  const openai = new OpenAI({
    baseURL: providers.openrouter.baseURL,
    apiKey,
  })
  const models = await openai.models.list()
  const filteredModels = models.data
    .filter(model => {
      return (
        model.architecture.modality === 'text->text' && model.id.toLowerCase().includes('deepseek')
      )
    })
    .map(model => model.id)
  return filteredModels
}

async function fetchSiliconflowModels() {
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey) {
    console.error('未找到硅基流动的 API KEY')
    return
  }
  const openai = new OpenAI({
    baseURL: providers.siliconflow.baseURL,
    apiKey,
  })
  const models = await openai.models.list()
  const filteredModels = models.data
    .filter(model => {
      return model.id.toLowerCase().includes('deepseek')
    })
    .map(model => model.id)
  return filteredModels
}

const updaters = {
  openrouter: fetchOpenrouterModels,
  siliconflow: fetchSiliconflowModels,
}

const newProviders = { ...providers }

for (const [key, fetchModels] of Object.entries(updaters)) {
  const models = await fetchModels()
  if (models) {
    newProviders[key].models = models
  }
}

await writeFile(providerPath, `export const providers = ${JSON.stringify(newProviders)} as const`)

// async function commitProviders() {
//   const commitMessage = 'chore: 更新 AI 模型列表'
//   await x('git', ['add', 'shared/providers.ts'], {
//     throwOnError: true,
//   })
//   await x('git', ['commit', '-m', commitMessage], { throwOnError: true })
// }

// await commitProviders()
