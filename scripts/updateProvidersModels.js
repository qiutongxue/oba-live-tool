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
    return null
  }
  try {
    const openai = new OpenAI({
      baseURL: providers.openrouter.baseURL,
      apiKey,
    })
    const models = await openai.models.list()
    const filteredModels = models.data
      .filter(model => {
        return (
          model.architecture?.modality === 'text->text' &&
          model.id?.toLowerCase().includes('deepseek')
        )
      })
      .map(model => model.id)
    console.log(`OpenRouter: 找到 ${filteredModels.length} 个模型`)
    return filteredModels
  } catch (error) {
    console.error('获取 OpenRouter 模型失败:', error.message)
    return null
  }
}

async function fetchSiliconflowModels() {
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey) {
    console.error('未找到硅基流动的 API KEY')
    return null
  }
  try {
    const openai = new OpenAI({
      baseURL: providers.siliconflow.baseURL,
      apiKey,
    })
    const models = await openai.models.list()
    const filteredModels = models.data
      .filter(model => {
        return model.id?.toLowerCase().includes('deepseek')
      })
      .map(model => model.id)
    console.log(`硅基流动: 找到 ${filteredModels.length} 个模型`)
    return filteredModels
  } catch (error) {
    console.error('获取硅基流动模型失败:', error.message)
    return null
  }
}

const updaters = {
  openrouter: fetchOpenrouterModels,
  siliconflow: fetchSiliconflowModels,
}

async function main() {
  try {
    const newProviders = { ...providers }
    let hasChanges = false

    for (const [key, fetchModels] of Object.entries(updaters)) {
      console.log(`正在更新 ${key} 模型列表...`)
      const models = await fetchModels()
      if (models && models.length > 0) {
        newProviders[key].models = models
        hasChanges = true
        console.log(`✓ ${key} 更新完成，共 ${models.length} 个模型`)
      } else {
        console.log(`⚠ ${key} 未更新（无数据或错误）`)
      }
    }

    if (!hasChanges) {
      console.log('没有模型需要更新，跳过文件写入')
      process.exit(0)
    }

    // 使用格式化 JSON 输出（2 个空格缩进）
    const formattedJson = JSON.stringify(newProviders, null, 2)
    const fileContent = `export const providers = ${formattedJson} as const\n`
    
    await writeFile(providerPath, fileContent, 'utf-8')
    console.log('✓ 文件写入成功:', providerPath)
  } catch (error) {
    console.error('更新失败:', error.message)
    process.exit(1)
  }
}

await main()

// async function commitProviders() {
//   const commitMessage = 'chore: 更新 AI 模型列表'
//   await x('git', ['add', 'shared/providers.ts'], {
//     throwOnError: true,
//   })
//   await x('git', ['commit', '-m', commitMessage], { throwOnError: true })
// }

// await commitProviders()
