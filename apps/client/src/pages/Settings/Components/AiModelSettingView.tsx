import React, { useEffect, useState } from 'react';
import { Input, Button, message, Form } from 'antd';
import type { SystemPromptConfig } from '@/types/systemPromptConfig';
import { useAzureOpenAI } from '@/components/useXAgent/AzureOpenAI';
import { IpcChannels } from "@/types/ipc/ipc";

const { TextArea } = Input;

const defaultConfig: SystemPromptConfig = {
  max_tokens: 2048,
  temperature: 0.5,
  messages: [
    {
      content: "OpenAI 训练的大型语言模型",
      role: "system"
    }
  ],
  model: "gpt-4o",
  stream: true
};

const CONFIG_FILE = 'gaia_desktop_config.json';

// 导出获取系统提示词配置的方法
export const getSystemPromptConfig = async (): Promise<SystemPromptConfig> => {
  try {
    const config = await window.ipcRenderer.invoke(IpcChannels.OPEN_FILE, {
      path: CONFIG_FILE,
      type: 'json'
    });
    
    const parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
    return parsedConfig.systemPrompt || defaultConfig;
  } catch (error) {
    console.error('加载系统提示词配置失败:', error);
    return defaultConfig;
  }
};

const AiModelSettingView: React.FC = () => {
  const [config, setConfig] = useState<SystemPromptConfig>(defaultConfig);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSystemPrompt();
  }, []);

  const loadSystemPrompt = async () => {
    try {
      const loadedConfig = await getSystemPromptConfig();
      setConfig(loadedConfig);
      // 提取系统提示词
      const systemMessage = loadedConfig.messages.find(msg => msg.role === 'system');
      setSystemPrompt(systemMessage?.content || '');
    } catch (error) {
      console.error('加载系统提示词配置失败:', error);
      message.error('加载系统提示词配置失败');
      setConfig(defaultConfig);
      setSystemPrompt(defaultConfig.messages[0].content);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // 更新配置中的系统提示词
      const newConfig = {
        ...config,
        messages: [
          {
            content: systemPrompt,
            role: "system"
          }
        ]
      };
      
      // 读取现有配置
      const existingConfigStr = await window.ipcRenderer.invoke(IpcChannels.OPEN_FILE, {
        path: CONFIG_FILE,
        type: 'json'
      });
      
      const existingConfig = typeof existingConfigStr === 'string' 
        ? JSON.parse(existingConfigStr)
        : existingConfigStr;
      
      // 更新系统提示词部分
      existingConfig.systemPrompt = newConfig;
      
      // 保存完整配置
      const result = await window.ipcRenderer.invoke(IpcChannels.SAVE_FILE, {
        path: CONFIG_FILE,
        content: JSON.stringify(existingConfig, null, 2),
        type: 'json'
      });

      if (result) {
        message.success('保存成功');
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      console.error('保存系统提示词配置失败:', error);
      message.error('保存系统提示词配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">AI 助手配置</h2>
        <p className="text-gray-600 mb-4">
          在这里配置 AI 助手的行为参数，包括系统提示词、模型参数等。
        </p>
      </div>
      
      <Form layout="vertical">
        <Form.Item label="系统提示词" className="mb-4">
          <TextArea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={15}
            placeholder="请输入系统提示词..."
            className="font-mono text-base leading-relaxed resize-y"
            style={{
              minHeight: '400px',
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: '#fafafa',
              border: '1px solid #d9d9d9',
            }}
          />
        </Form.Item>

        <Form.Item label="模型参数" className="mb-4">
          <div className="flex gap-4">
            <Input
              type="number"
              value={config.max_tokens}
              onChange={(e) => handleConfigChange('max_tokens', parseInt(e.target.value))}
              placeholder="最大 Token 数"
              className="w-1/3"
            />
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.temperature}
              onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
              placeholder="温度"
              className="w-1/3"
            />
            <Input
              value={config.model}
              onChange={(e) => handleConfigChange('model', e.target.value)}
              placeholder="模型名称"
              className="w-1/3"
            />
          </div>
        </Form.Item>

        <div className="flex justify-end">
          <Button 
            type="primary"
            onClick={handleSave}
            loading={loading}
          >
            保存设置
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default AiModelSettingView;
