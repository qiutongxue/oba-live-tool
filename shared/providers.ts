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
    models: ['deepseek-ai/DeepSeek-R1', 'Pro/deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V3', 'Pro/deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B', 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B', 'Pro/deepseek-ai/DeepSeek-R1-Distill-Llama-8B', 'Pro/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', 'Pro/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B'],
  },
  volcengine: {
    name: '火山引擎',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3/',
    apiUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    models: [],
  },

} as const
