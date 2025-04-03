import { useState, useEffect } from 'react';
import { useToolPresetStore } from '@/stores/ToolPresetStore';
import {
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Tooltip,
  Typography,
  Select,
  Table,
  Button,
  Space,
  Tag,
  Empty,
  message,
} from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMcpToolStore } from '@/stores/McpToolStore';
import { McpServer, McpServerTool, UserInput } from '@/types/xKey/types';

const { TextArea } = Input;
const { Text } = Typography;

/** 按需加载 OpenAI 表单模板，配置密钥，模型参数，提示词等 */
export const OpenAIFormTemplate = () => {
  const { formData, handleFieldChange, errors } = useToolPresetStore();
  const { servers } = useMcpToolStore();

  // 初始化服务器列表
  const [formServers, setFormServers] = useState<McpServer[]>(formData?.servers || []);

  // 当formServers变化时，更新formData
  useEffect(() => {
    // 由于类型限制，这里需要将McpServer[]转换为符合UserInput[]的格式
    // 这里我们假设服务器配置可以作为一种特殊的用户输入
    // 实际应用中可能需要更复杂的转换逻辑
    handleFieldChange('servers', formServers as any);
  }, [formServers, handleFieldChange]);

  // 获取服务器键列表
  const serverKeys = Array.from(servers.keys());

  // 添加新的服务行
  const addServerRow = () => {
    // 检查是否有空行（未选择服务的行）
    const hasEmptyRow = formServers.some(server => !server.key);
    if (hasEmptyRow) {
      message.warning('请先完成已添加的MCP服务配置');
      return;
    }
    
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
    // 检查是否已存在相同的服务
    const isDuplicate = formServers.some((server, idx) => 
      idx !== index && server.key === value
    );
    
    if (isDuplicate) {
      message.error(`已添加相同的MCP服务: ${value}`);
      return;
    }
    
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
                options={serverKeys
                  .filter(server => {
                    // 过滤掉已经被其他行选择的服务
                    // 当前行已选择的服务除外
                    const isSelected = formServers.some((s, idx) => 
                      idx !== index && s.key === server
                    );
                    return !isSelected;
                  })
                  .map((server) => ({ label: server, value: server }))}
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
          value={formData?.baseUrl}
          onChange={(e) => handleFieldChange('baseUrl', e.target.value)}
          placeholder="https://api.example.com"
        />
      </Form.Item>
      <Form.Item
        label={<Tooltip title="API密钥，用于与AI模型通信">🔑 API密钥</Tooltip>}
        validateStatus={errors.apiKey ? 'error' : undefined}
        help={errors.apiKey}
      >
        <Input.Password
          value={formData?.apiKey}
          onChange={(e) => handleFieldChange('apiKey', e.target.value)}
          placeholder="sk-..."
          iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>

      <Form.Item label={<Tooltip title="比如 gpt-4o-mini, claude-3-5-sonnet">🤖 模型名称</Tooltip>}>
        <Input
          value={formData?.model ?? ''}
          onChange={(e) => handleFieldChange('model', e.target.value)}
          placeholder="deepseek-chat | gpt-4o-mini | claude-3-5-sonnet"
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={
              <Tooltip title="采样温度 0-2, 调小增加稳定性，调大增加创造性">🌡️ Temperature</Tooltip>
            }
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
            label={
              <Tooltip title="概率质量采样 0-1, 调小增加稳定性，调大增加创造性">📊 Top P</Tooltip>
            }
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
              onChange={(value) =>
                handleFieldChange('presence_penalty', value !== null ? value : 0)
              }
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
              onChange={(value) =>
                handleFieldChange('frequency_penalty', value !== null ? value : 0)
              }
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

      <Form.Item label={<Tooltip title="用于引导AI的行为">💡 系统提示词</Tooltip>}>
        <TextArea
          value={formData?.systemPrompt ?? ''}
          onChange={(e) => handleFieldChange('systemPrompt', e.target.value)}
          placeholder="可选的系统提示词"
          rows={3}
        />
      </Form.Item>

      <Form.Item label={<Tooltip title="只在对话开始时由AI发送">👋 欢迎语</Tooltip>}>
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
  );
};
