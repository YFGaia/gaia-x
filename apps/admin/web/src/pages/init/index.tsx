import { initDatabase } from '@/services/gaia-x-admin/initdb';
import { PageContainer } from '@ant-design/pro-layout';
import { useNavigate } from '@umijs/max';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  message,
  Select,
  Space,
  Typography,
} from 'antd';
import { useState } from 'react';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const InitPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 初始化数据库
  const handleInitDB = async (values: any) => {
    setLoading(true);
    try {
      const { ...submitData } = values;

      const result = await initDatabase(submitData);
      if (result.code === 0) {
        message.success('数据库初始化成功！');
        // 初始化成功后返回登录页面
        setTimeout(() => {
          navigate('/user/login');
        }, 1500);
      } else {
        message.error(result.msg || '初始化失败，请检查配置！');
      }
    } catch (error) {
      console.error('初始化出错:', error);
      message.error('初始化失败，请稍后重试！');
    } finally {
      setLoading(false);
    }
  };

  // 返回登录页面
  const handleBack = () => {
    navigate('/user/login');
  };

  return (
    <PageContainer>
      <Card>
        <Typography>
          <Title level={2}>系统初始化</Title>
          <Paragraph>
            欢迎使用 Gaia-X-Admin
            系统。在使用系统前，需要先进行数据库初始化，这将创建必要的表结构和初始数据。
          </Paragraph>
          <Paragraph>
            请填写数据库连接信息和管理员密码，然后点击&quot初始化数据库&quot按钮开始初始化过程。此过程可能需要几分钟时间，请耐心等待。
          </Paragraph>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleInitDB}
            initialValues={{
              dbtype: 'mysql',
              host: '127.0.0.1',
              port: '3306',
              username: 'root',
              password: '',
              dbname: 'gaia_admin',
              autoCreate: true,
              adminPassword: '', // 管理员密码初始为空
            }}
          >
            <Divider orientation="left">数据库配置</Divider>
            <Form.Item
              name="dbtype"
              label="数据库类型"
              rules={[{ required: true, message: '请选择数据库类型' }]}
            >
              <Select>
                <Option value="mysql">MySQL</Option>
                <Option value="pgsql">PostgreSQL</Option>
                <Option value="sqlite">SQLite</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="host"
              label="数据库主机"
              rules={[{ required: true, message: '请输入数据库主机地址' }]}
            >
              <Input placeholder="127.0.0.1" />
            </Form.Item>

            <Form.Item
              name="port"
              label="端口"
              rules={[{ required: true, message: '请输入数据库端口' }]}
            >
              <Input placeholder="3306" />
            </Form.Item>

            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入数据库用户名' }]}
            >
              <Input placeholder="root" />
            </Form.Item>

            <Form.Item name="password" label="密码">
              <Input.Password placeholder="数据库密码" />
            </Form.Item>

            <Form.Item
              name="dbname"
              label="数据库名"
              rules={[{ required: true, message: '请输入数据库名' }]}
            >
              <Input placeholder="gaia_admin" />
            </Form.Item>

            <Form.Item name="autoCreate" valuePropName="checked">
              <Checkbox>自动创建数据库（如不存在）</Checkbox>
            </Form.Item>

            <Divider orientation="left">管理员设置</Divider>
            <Form.Item
              name="adminPassword"
              label="管理员密码"
              rules={[
                { required: true, message: '请设置管理员密码' },
                { min: 6, message: '密码长度至少为6位' },
              ]}
              extra="用于设置系统管理员(admin)账户的登录密码"
            >
              <Input.Password placeholder="请输入管理员密码" />
            </Form.Item>

            <Form.Item
              name="confirmAdminPassword"
              label="确认管理员密码"
              dependencies={['adminPassword']}
              rules={[
                { required: true, message: '请确认管理员密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('adminPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="请再次输入管理员密码" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  初始化数据库
                </Button>
                <Button onClick={handleBack}>返回登录页</Button>
              </Space>
            </Form.Item>
          </Form>
        </Typography>
      </Card>
    </PageContainer>
  );
};

export default InitPage;
