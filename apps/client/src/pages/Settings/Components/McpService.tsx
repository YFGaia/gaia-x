import { useMcpToolStore } from '@/stores/McpToolStore';
import { useScheduleStore } from '@/stores/ScheduleStore';
import { AppstoreOutlined, CodeOutlined, ToolOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Collapse, Empty, Input, List, Modal, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Paragraph, Text } = Typography;

// 安装命令类型
type CommandType = 'default' | 'uvx' | 'npx' | 'sse';

const McpService: React.FC = () => {
  const { installTool, servers, initialize } = useMcpToolStore();
  const initSchedule = useScheduleStore((state) => state.getSchedule('initialize-runtimes'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [serverId, setServerId] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [detectedCommandType, setDetectedCommandType] = useState<CommandType>('default');
  const [serverList, setServerList] = useState<Array<{id: string, config: any, tools: any[]}>>([]);

  // 组件初始化时加载MCP服务
  useEffect(() => {
    initialize();
  }, []);
  
  // 加载服务器列表
  useEffect(() => {
    console.log('服务器列表更新:', servers);
    const serverEntries = Array.from(servers.entries()).map(([id, server]) => ({
      id,
      config: server.config,
      tools: server.tools || []
    }));
    setServerList(serverEntries);
  }, [servers]);

  // 根据输入的命令自动检测命令类型
  useEffect(() => {
    const command = packageName.trim();
    if (command.startsWith('npx ')) {
      setDetectedCommandType('npx');
    } else if (command.startsWith('uvx ')) {
      setDetectedCommandType('uvx');
    } else if (command.startsWith('http://') || command.startsWith('https://') || command.startsWith('ws://') || command.startsWith('wss://')) {
      // SSE类型是一个URL，用于创建SSE客户端传输
      setDetectedCommandType('sse');
    } else {
      setDetectedCommandType('default');
    }
  }, [packageName]);

  const handleInstall = async () => {
    if (!packageName.trim() || !serverId.trim()) {
      return;
    }

    setIsInstalling(true);
    setInstallError(null);
    
    try {
      // 使用原始命令，不添加时区参数
      const finalCommand = packageName.trim();
      
      const success = await installTool(finalCommand, serverId.trim());
      if (success) {
        
        // 关闭模态框并清空输入
        setIsModalOpen(false);
        setPackageName('');
        setServerId('');
      }
    } catch (error: any) {
      setInstallError(error.message || '安装失败，请检查参数后重试');
    } finally {
      setIsInstalling(false);
    }
  };

  const showModal = () => {
    setIsModalOpen(true);
    setInstallError(null);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setPackageName('');
    setServerId('');
    setInstallError(null);
  };

  // 获取命令类型的说明文字
  const getCommandTypeDescription = () => {
    switch (detectedCommandType) {
      case 'npx':
        return '使用Node.js环境临时下载并执行，无需安装';
      case 'uvx':
        return '使用Python的uvx在隔离环境中执行，直接配置无需安装';
      case 'sse':
        return '使用SSE服务器事件流传输，URL将用于创建SSE客户端连接';
      default:
        return '默认使用uvx执行Python包，直接配置无需安装';
    }
  };

  // 获取命令类型的标签颜色
  const getCommandTypeColor = () => {
    switch (detectedCommandType) {
      case 'npx':
        return 'green';
      case 'uvx':
        return 'purple';
      case 'sse':
        return 'orange';
      default:
        return 'default';
    }
  };

  // 获取服务类型的图标
  const getServiceIcon = (config: any) => {
    if (!config) return <AppstoreOutlined />;
    
    if (config.transport === 'sse') {
      return <CodeOutlined style={{ color: '#e67e22' }} />;
    }
    
    switch (config.command) {
      case 'npx':
        return <CodeOutlined style={{ color: '#3eaf7c' }} />;
      case 'uvx':
        return <CodeOutlined style={{ color: '#4584b6' }} />;
      default:
        return <AppstoreOutlined />;
    }
  };

  // 获取服务类型的标签
  const getServiceTypeTag = (config: any) => {
    if (!config) return null;
    
    let color = 'default';
    let text = '未知';
    
    if (config.transport === 'sse') {
      color = 'orange';
      text = 'SSE';
    } else {
      switch (config.command) {
        case 'npx':
          color = 'green';
          text = 'NPX';
          break;
        case 'uvx':
          color = 'purple';
          text = 'UVX';
          break;
        default:
          if (typeof config.command === 'string') {
            text = config.command.toUpperCase();
          }
      }
    }
    
    return <Tag className="ml-2" color={color}>{text}</Tag>;
  };

  return (
    <div className="mcp-service p-6 h-full overflow-auto">
      <Card className="mb-6">
        <Title level={4}>MCP服务管理</Title>
        <Paragraph>
          MCP（Model Control Protocol）服务允许您安装和管理各种工具，扩展应用程序的功能。
        </Paragraph>
        
        <Space direction="vertical" className="w-full">
          <div className="flex justify-between">
            <Button type="primary" onClick={showModal} loading={!!initSchedule}>
              {!!initSchedule ? '初始化中...' : '安装工具'}
            </Button>
          </div>
        </Space>
      </Card>

      {/* 服务列表 */}
      <Card title="已安装的MCP服务" className="mb-6">
        <div className="max-h-[50vh] overflow-auto">
          {serverList.length > 0 ? (
            <List
              itemLayout="vertical"
              dataSource={serverList}
              className="server-list"
              renderItem={item => (
                <List.Item className="break-words">
                  <div className="flex items-center mb-2">
                    {getServiceIcon(item.config)}
                    <Text strong className="ml-2 text-lg break-all">{item.id}</Text>
                    {getServiceTypeTag(item.config)}
                  </div>
                  
                  <div className="ml-6 text-sm text-gray-500">
                    {item.config && (
                      <div className="mb-2">
                        <Text type="secondary">
                          {item.config.transport === 'sse' ? 'URL: ' : '命令: '}
                        </Text>
                        <Text code className="break-all">
                          {item.config.transport === 'sse' 
                            ? item.config.url 
                            : `${item.config.command} ${item.config.args?.join(' ')}`}
                        </Text>
                      </div>
                    )}
                    
                    <Collapse ghost className="mt-2" items={[
                      {
                        key: '1',
                        label: `可用工具 (${item.tools.length})`,
                        children: (
                          <div className="max-h-[30vh] overflow-auto pr-2">
                            {item.tools.length > 0 ? (
                              <List
                                size="small"
                                dataSource={item.tools}
                                className="tool-list"
                                renderItem={tool => (
                                  <List.Item className="break-words">
                                    <div>
                                      <Text strong className="break-all"><ToolOutlined className="mr-1" />{tool.name}</Text>
                                      <div className="ml-5 mt-1">
                                        <Text type="secondary" className="break-all">{tool.description}</Text>
                                      </div>
                                    </div>
                                  </List.Item>
                                )}
                              />
                            ) : (
                              <Empty description="暂无可用工具" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                          </div>
                        )
                      }
                    ]} />
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无已安装的MCP服务" />
          )}
        </div>
      </Card>

      <Modal
        title="安装MCP工具"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button 
            key="install" 
            type="primary" 
            onClick={handleInstall} 
            loading={isInstalling}
            disabled={!packageName.trim() || !serverId.trim()}
          >
            安装
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" className="w-full mt-4">
          {installError && (
            <Alert
              message="安装错误"
              description={installError}
              type="error"
              showIcon
              closable
            />
          )}
          
          <div>
            <div className="mb-2">MCP名称 (必填)</div>
            <Input
              placeholder="输入MCP名称，例如: time, git, server-everything"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-2">
              <Text type="secondary">
                MCP名称用于标识和管理此工具，建议使用简短、有意义的名称
              </Text>
            </div>
          </div>
          
          <div>
            <div className="mb-2">安装命令 (必填)</div>
            <Input
              placeholder="输入安装命令，例如: mcp-server-time 或 npx create-mcp-app"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-2 flex items-center">
              <Text type="secondary" className="mr-2">
                检测到的安装类型:
              </Text>
              <Tag color={getCommandTypeColor()}>
                {detectedCommandType.toUpperCase()}
              </Tag>
              <Text type="secondary" className="ml-2">
                {getCommandTypeDescription()}
              </Text>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <Text type="secondary">
                支持的命令前缀: npx (Node.js), uvx (Python), 或输入URL (SSE)
              </Text>
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default McpService; 