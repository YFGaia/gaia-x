import { Preset } from '@/types/xKey/types'

export const validateForm = (formData: Preset): Record<string, string> => {
  const newErrors: Record<string, string> = {}

  if (!formData.title.trim()) {
    newErrors.title = '标题不能为空'
  }

  // 计算字符串的半角长度：中文字符计2，其他字符计1
  const getHalfWidthLength = (str: string): number => {
    return Array.from(str).reduce((total, char) => {
      // 使用正则判断是否为全角字符（包括中文、全角标点等）
      return total + (/[\u4e00-\u9fa5\uff00-\uffff]/.test(char) ? 2 : 1);
    }, 0);
  };

  const titleLength = getHalfWidthLength(formData.title.trim());
  if (titleLength > 11) {
    newErrors.title = '标题长度不能超过11个半角字符（中文字符占2个半角位置）';
  }

  if (formData.provider === 'openai' && !formData.apiKey.trim()) {
    newErrors.apiKey = 'API密钥不能为空'
  }

  if (formData.provider === 'openai') {
    // check model is valid
    if (!formData.model || !formData.model.trim()) {
      newErrors.model = '模型不能为空'
    }
    // check baseUrl is valid
    if (!formData.baseUrl || !formData.baseUrl.trim()) {
      newErrors.baseUrl = 'API地址不能为空'
    }

    // check temp, top_p, presence_penalty, frequency_penalty, max_tokens, greeting, systemPrompt
    if (formData.temperature && (formData.temperature < 0 || formData.temperature > 2)) {
      newErrors.temperature = '采样温度必须在0到2之间'
    }
    if (formData.top_p && (formData.top_p < 0 || formData.top_p > 1)) {
      newErrors.top_p = '概率质量采样必须在0到1之间'
    }
    if (formData.presence_penalty && (formData.presence_penalty < -2 || formData.presence_penalty > 2)) {
      newErrors.presence_penalty = '存在惩罚必须在-2到2之间'
    }
    if (formData.frequency_penalty && (formData.frequency_penalty < -2 || formData.frequency_penalty > 2)) {
      newErrors.frequency_penalty = '频率惩罚必须在-2到2之间'
    }
    if (formData.max_tokens && (formData.max_tokens < 1 || formData.max_tokens > 32000)) {
      newErrors.max_tokens = '最大令牌数必须在1到32000之间'
    }
    if (formData.greeting && formData.greeting.length > 100) {
      newErrors.greeting = '欢迎语不能超过100个字符'
    }
    if (formData.systemPrompt && formData.systemPrompt.length > 1000) {
      newErrors.systemPrompt = '系统提示词不能超过1000个字符'
    }
  } else if (formData.provider.includes('dify')) {
    // check baseUrl is valid
    if (!formData.baseUrl || !formData.baseUrl.trim()) {
      newErrors.baseUrl = 'API地址不能为空'
    }
  }

  return newErrors;
}