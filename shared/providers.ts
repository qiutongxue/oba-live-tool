export const providers = {
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    apiUrl: 'https://platform.deepseek.com/api_keys',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiUrl: 'https://openrouter.ai/keys',
    models: ['deepseek/deepseek-r1-distill-qwen-1.5b', 'deepseek/deepseek-r1-distill-qwen-32b', 'deepseek/deepseek-r1-distill-qwen-14b', 'deepseek/deepseek-r1-distill-llama-70b:free', 'deepseek/deepseek-r1-distill-llama-70b', 'deepseek/deepseek-r1:free', 'deepseek/deepseek-r1', 'deepseek/deepseek-r1:nitro', 'deepseek/deepseek-chat', 'deepseek/deepseek-chat-v2.5'],
  },
  siliconflow: {
    name: '硅基流动',
    baseURL: 'https://api.siliconflow.cn/v1',
    apiUrl: 'https://cloud.siliconflow.cn/account/ak',
    models: ['deepseek-ai/DeepSeek-R1', 'Pro/deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V3', 'Pro/deepseek-ai/DeepSeek-V3'],
  },

} as const
