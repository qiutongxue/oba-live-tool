/**
 * 内置默认 providers，作为首次启动或离线时的降级方案。
 * 应用启动时会从 GitHub 获取最新 providers 并缓存到本地，
 * 后续启动优先使用缓存。
 */
export const providers: Record<string, ProviderInfo> = {
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    apiUrl: 'https://platform.deepseek.com/api_keys',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiUrl: 'https://openrouter.ai/keys',
    models: [
      'deepseek/deepseek-v4-pro',
      'deepseek/deepseek-v4-flash',
      'nex-agi/deepseek-v3.1-nex-n1',
      'deepseek/deepseek-v3.2-speciale',
      'deepseek/deepseek-v3.2',
      'deepseek/deepseek-v3.2-exp',
      'deepseek/deepseek-v3.1-terminus',
      'deepseek/deepseek-chat-v3.1',
      'tngtech/deepseek-r1t2-chimera',
      'deepseek/deepseek-r1-0528',
      'deepseek/deepseek-chat-v3-0324',
      'deepseek/deepseek-r1-distill-qwen-32b',
      'deepseek/deepseek-r1-distill-llama-70b',
      'deepseek/deepseek-r1',
      'deepseek/deepseek-chat',
    ],
  },
  siliconflow: {
    name: '硅基流动',
    baseURL: 'https://api.siliconflow.cn/v1',
    apiUrl: 'https://cloud.siliconflow.cn/account/ak',
    models: [
      'deepseek-ai/DeepSeek-V3.2',
      'Pro/deepseek-ai/DeepSeek-V3.2',
      'deepseek-ai/DeepSeek-V3.1-Terminus',
      'Pro/deepseek-ai/DeepSeek-V3.1-Terminus',
      'deepseek-ai/DeepSeek-R1',
      'Pro/deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
      'Pro/deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-OCR',
      'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    ],
  },
  volcengine: {
    name: '火山引擎',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3/',
    apiUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    models: [],
  },
  custom: { name: '自定义', baseURL: '', apiUrl: '', models: [] },
}
