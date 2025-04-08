import { useState, useEffect } from 'react'
import { useToolPresetStore } from '@/stores/ToolPresetStore'
import { Form, Input, InputNumber, Row, Col, Tooltip, Select, Table, Empty, Tag, Button, Typography } from 'antd'
import { useMcpToolStore } from '@/stores/McpToolStore';
import { McpServer, McpServerTool } from '@/types/xKey/types';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

// 定义模型供应商和对应的模型
const MODEL_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'bedrock', name: 'Bedrock' },
  { id: 'aruze', name: 'Aruze' }
];

// 模型供应商和模型的映射关系
const MODEL_MAPPING: Record<string, Array<{ id: string, name: string }>> = {
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' }
  ],
  bedrock: [
    { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet' },
    { id: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'Claude 3.7 Sonnet' }
  ],
  aruze: [
    { id: 'gpt-4o', name: 'GPT-4o' }
  ]
};

// 从环境变量获取 API 地址
const GAIA_AI_API_URL = import.meta.env.VITE_BASE_URL + import.meta.env.VITE_GAIA_AI_API_URL_BASE_URL || 'http://gaia-x.cn/api/v1/chat/completion';

/** 按需加载 GaiaAI 表单模板，配置密钥，模型参数，提示词等 */
export const GaiaAIFormTemplate = () => {
  const { formData, handleFieldChange, errors } = useToolPresetStore()
  const [viewPassword, setViewPassword] = useState(false)
  const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([])

  const { servers } = useMcpToolStore();
  // 初始化服务器列表
  const [formServers, setFormServers] = useState<McpServer[]>(formData?.servers || []);

  
  // 当模型供应商变化时，更新可用的模型列表
  useEffect(() => {
    if (formData?.model_provider_id) {
      const modelProviderId = formData.model_provider_id;
      const models = MODEL_MAPPING[modelProviderId] || [];
      setAvailableModels(models);
      
      // 如果当前选择的模型不在新的可用模型列表中，则清空模型选择
      if (formData.model && !models.some(m => m.id === formData.model)) {
        handleFieldChange('model', models.length > 0 ? models[0].id : '');
      }
    } else {
      setAvailableModels([]);
    }
  }, [formData?.model_provider_id]);
  
  // 当组件初始化时，如果没有选择模型供应商，默认选择第一个
  useEffect(() => {
    if (!formData?.model_provider_id && MODEL_PROVIDERS.length > 0) {
      handleFieldChange('model_provider_id', MODEL_PROVIDERS[0].id);
    }
    handleFieldChange('baseUrl', GAIA_AI_API_URL);
    handleFieldChange('servers', formServers as any);
  }, [formServers, handleFieldChange]);

  // 获取服务器键列表
  const serverKeys = Array.from(servers.keys());

  // 添加新的服务行
  const addServerRow = () => {
    setFormServers([...formServers, { key: '', config: {}, tools: [] }]);
  };

  // 删除服务行
  const removeServerRow = (index: number) => {
    const newServers = [...formServers];
    newServers.splice(index, 1);
    setFormServers(newServers);
  };

  // 更新服务器选择
  const handleServerChange = (value: string, index: number) => {
    const newServers = [...formServers];
    const serverData = servers.get(value);
    
    if (serverData) {
      newServers[index] = {
        key: value,
        config: serverData.config,
        tools: [], // 清空工具，让用户重新选择
      };
      setFormServers(newServers);
    }
  };

  // 更新工具选择
  const handleToolsChange = (selectedTools: string[], index: number) => {
    const newServers = [...formServers];
    const serverKey = newServers[index].key;
    const serverData = servers.get(serverKey);
    
    if (serverData) {
      // 根据选择的工具名称过滤出完整的工具对象
      const selectedToolObjects = serverData.tools.filter(
        (tool: McpServerTool) => selectedTools.includes(tool.name)
      );
      
      newServers[index].tools = selectedToolObjects;
      setFormServers(newServers);
    }
  };

  // 获取特定服务器的可用工具选项
  const getToolOptions = (serverKey: string) => {
    const serverData = servers.get(serverKey);
    if (!serverData || !serverData.tools || serverData.tools.length === 0) {
      return [];
    }
    
    return serverData.tools.map((tool: McpServerTool) => ({
      label: (
        <div className="flex items-start py-1">
          <div className="flex flex-col" style={{ maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
            <span className="font-medium">{tool.name}</span>
            <span className="text-xs text-gray-500" style={{ whiteSpace: 'pre-wrap' }}>{tool.description}</span>
          </div>
        </div>
      ),
      value: tool.name,
      tool
    }));
  };

  // 自定义渲染选中的标签
  const tagRender = (props: any) => {
    const { value, closable, onClose, tool } = props;
    
    // 如果是省略标签（+N），使用默认渲染
    if (props.label && typeof props.label === 'string' && props.label.startsWith('+')) {
      return (
        <Tag style={{ marginRight: 3 }}>
          {props.label}
        </Tag>
      );
    }
    
    return (
      <Tag
        closable={closable}
        onClose={onClose}
        style={{ marginRight: 3 }}
      >
        <Tooltip title={tool?.description || value}>
          <span>{value}</span>
        </Tooltip>
      </Tag>
    );
  };

  // 渲染MCP服务表格
  const renderMcpServerTable = () => {
    return (
      <Table
        rowKey={(_, index) => `server-${index}`}
        dataSource={formServers}
        pagination={false}
        showHeader={false}
        locale={{
          emptyText: <Empty description="暂无MCP服务" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
        columns={[
          {
            title: 'MCP服务',
            dataIndex: 'key',
            key: 'key',
            width: '30%',
            render: (value, _, index) => (
              <Select
                placeholder="选择MCP服务"
                style={{ width: '100%' }}
                value={value || undefined}
                onChange={(value) => handleServerChange(value, index)}
                options={serverKeys.map((server) => ({ label: server, value: server }))}
                status={!value ? 'error' : undefined}
                getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
              />
            ),
          },
          {
            title: '工具',
            dataIndex: 'tools',
            key: 'tools',
            render: (tools, record, index) => {
              const serverKey = record.key;
              if (!serverKey) {
                return <Text type="secondary">请先选择MCP服务</Text>;
              }
              
              const selectedToolNames = tools.map((tool: McpServerTool) => tool.name);
              const toolOptions = getToolOptions(serverKey);
              
              return (
                <Select
                  mode="multiple"
                  placeholder="选择工具"
                  style={{ width: '100%' }}
                  value={selectedToolNames}
                  onChange={(values) => handleToolsChange(values, index)}
                  options={toolOptions}
                  optionFilterProp="value"
                  showSearch
                  allowClear
                  maxTagCount={1}
                  tagRender={(props) => {
                    // 查找对应的工具信息
                    const toolInfo = toolOptions.find(option => option.value === props.value)?.tool;
                    return tagRender({...props, tool: toolInfo});
                  }}
                  listItemHeight={60}
                  listHeight={400}
                  dropdownStyle={{ minWidth: '500px', maxWidth: '800px', zIndex: 1100 }}
                  popupMatchSelectWidth={false}
                  getPopupContainer={(triggerNode) => document.body}
                />
              );
            },
          },
          {
            title: '操作',
            key: 'action',
            width: '10%',
            render: (_, __, index) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeServerRow(index)}
                aria-label="删除"
              />
            ),
          },
        ]}
        footer={() => (
          <Button 
            type="dashed" 
            block 
            icon={<PlusOutlined />} 
            onClick={addServerRow}
          >
            添加MCP服务
          </Button>
        )}
      />
    );
  };

  
  return (
    <Form layout="vertical">
      <Form.Item 
        label={<Tooltip title="API地址，用于与AI模型通信">🔗 API地址</Tooltip>}
        validateStatus={errors.baseUrl ? 'error' : undefined}
        help={errors.baseUrl}
      >
        <Input
          value={GAIA_AI_API_URL}
          disabled={true}
          placeholder="API地址已固定，无需修改"
        />
      </Form.Item>
      <Form.Item
        label={<Tooltip title="选择模型供应商">🤖 模型厂商</Tooltip>}
      >
        <Select
          value={formData?.model_provider_id ? formData.model_provider_id : undefined}
          onChange={(value) => handleFieldChange('model_provider_id', value)}
          placeholder="请选择模型厂商"
          options={MODEL_PROVIDERS.map(provider => ({
            value: provider.id,
            label: provider.name
          }))}
        />
      </Form.Item>

      <Form.Item
        label={<Tooltip title="选择模型名称">🤖 模型名称</Tooltip>}
      >
        <Select
          value={formData?.model || undefined}
          onChange={(value) => handleFieldChange('model', value)}
          placeholder="请选择模型名称"
          disabled={!formData?.model_provider_id || availableModels.length === 0}
          options={availableModels.map(model => ({
            value: model.id,
            label: model.name
          }))}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Tooltip title="采样温度 0-2, 调小增加稳定性，调大增加创造性">🌡️ Temperature</Tooltip>}
          >
            <InputNumber
              value={formData?.temperature ?? 0.6}
              onChange={(value) => handleFieldChange('temperature', value !== null ? value : 0.6)}
              min={0}
              max={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={<Tooltip title="概率质量采样 0-1, 调小增加稳定性，调大增加创造性">📊 Top P</Tooltip>}
          >
            <InputNumber
              value={formData?.top_p ?? 0.8}
              onChange={(value) => handleFieldChange('top_p', value !== null ? value : 0.8)}
              min={0}
              max={1}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Tooltip title="存在惩罚 -2-2, 防止重复输出相同内容">🎯 Presence</Tooltip>}
          >
            <InputNumber
              value={formData?.presence_penalty ?? 0}
              onChange={(value) => handleFieldChange('presence_penalty', value !== null ? value : 0)}
              min={-2}
              max={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={<Tooltip title="频率惩罚 -2-2, 防止重复输出相同内容">📈 Frequency</Tooltip>}
          >
            <InputNumber
              value={formData?.frequency_penalty ?? 0}
              onChange={(value) => handleFieldChange('frequency_penalty', value !== null ? value : 0)}
              min={-2}
              max={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={<Tooltip title="最大令牌数 1-32000, 越小越节省成本">📝 Max Tokens</Tooltip>}
      >
        <InputNumber
          value={formData?.max_tokens ?? 4096}
          onChange={(value) => handleFieldChange('max_tokens', value !== null ? value : 4096)}
          min={1}
          max={32000}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item
        label={<Tooltip title="用于引导AI的行为">💡 系统提示词</Tooltip>}
      >
        <TextArea
          value={formData?.systemPrompt ?? ''}
          onChange={(e) => handleFieldChange('systemPrompt', e.target.value)}
          placeholder="可选的系统提示词"
          rows={3}
        />
      </Form.Item>

      <Form.Item
        label={<Tooltip title="只在对话开始时由AI发送">👋 欢迎语</Tooltip>}
      >
        <TextArea
          value={formData?.greeting ?? ''}
          onChange={(e) => handleFieldChange('greeting', e.target.value)}
          placeholder="可选的欢迎语"
          rows={2}
        />
      </Form.Item>
      
      <Form.Item label={<Tooltip title="绑定MCP服务，提供额外功能">🔌 MCP服务</Tooltip>}>
        {renderMcpServerTable()}
      </Form.Item>
    </Form>
  )
}