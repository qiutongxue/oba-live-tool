export const providers = {
  deepseek: {
    name: 'DeepSeek',
    apiUrl: 'https://platform.deepseek.com/api_keys',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  openrouter: {
    name: 'OpenRouter',
    apiUrl: 'https://openrouter.ai/keys',
    models: ['deepseek/deepseek-r1-distill-qwen-1.5b', 'deepseek/deepseek-r1-distill-qwen-32b', 'deepseek/deepseek-r1-distill-qwen-14b', 'deepseek/deepseek-r1-distill-llama-70b:free', 'deepseek/deepseek-r1-distill-llama-70b', 'deepseek/deepseek-r1:free', 'deepseek/deepseek-r1', 'deepseek/deepseek-r1:nitro', 'deepseek/deepseek-chat', 'deepseek/deepseek-chat-v2.5'],
  },
} as const
