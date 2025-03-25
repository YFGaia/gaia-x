import { Button, GetProp } from 'antd';
import { Prompts, Welcome } from '@ant-design/x';
import { Space } from 'antd';
import { createStyles } from 'antd-style';
import logoSite from '@/assets/logo-site.png';
import {
  ShareAltOutlined,
  EllipsisOutlined,
  FireOutlined,
  ReadOutlined,
  HeartOutlined,
  SmileOutlined,
  CommentOutlined,
} from '@ant-design/icons';

const useStyle = createStyles(({ token, css }) => {
  return {
    placeholder: css`
      padding-top: 32px;
    `,
  };
});

const renderTitle = (icon: React.ReactElement, title: string) => (
  <Space align="start">
    {icon}
    <span>{title}</span>
  </Space>
);

const placeholderPromptsItems: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    label: renderTitle(<FireOutlined style={{ color: '#FF4D4F' }} />, 'Hot Topics'),
    description: 'What are you interested in?',
    children: [
      {
        key: '1-1',
        description: `What's new in X?`,
      },
      {
        key: '1-2',
        description: `What's AGI?`,
      },
      {
        key: '1-3',
        description: `Where is the doc?`,
      },
    ],
  },
  {
    key: '2',
    label: renderTitle(<ReadOutlined style={{ color: '#1890FF' }} />, 'Design Guide'),
    description: 'How to design a good product?',
    children: [
      {
        key: '2-1',
        icon: <HeartOutlined />,
        description: `Know the well`,
      },
      {
        key: '2-2',
        icon: <SmileOutlined />,
        description: `Set the AI role`,
      },
      {
        key: '2-3',
        icon: <CommentOutlined />,
        description: `Express the feeling`,
      },
    ],
  },
];

interface PlaceholderNodeProps {
  onRequest: (key: string) => void;
}

const placeholderNode: React.FC<PlaceholderNodeProps> = ({ onRequest }) => {
  const { styles } = useStyle();

  const onPromptsItemClick: GetProp<typeof Prompts, 'onItemClick'> = (info) => {
    onRequest(info.data.description as string);
  };

  return (
    <Space direction="vertical" size={16} className={styles.placeholder}>
      <Welcome
        variant="borderless"
        icon={
          <img
            src={logoSite}
            alt="Logo"
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 1px white)'
            }}
          />
        }
        title={"Hello, I'm Gaia-X"}
        description="基于 MCP 协议的智能桌面助手，为开发者提供 AI 驱动的工具集成与智能协作体验"
        extra={
          <Space>
            {/* <Button icon={<ShareAltOutlined />} /> */}
            {/* <Button icon={<EllipsisOutlined />} /> */}
          </Space>
        }
      />
      {/* <Prompts
        title="Do you want?"
        items={placeholderPromptsItems}
        styles={{
          list: {
            width: '100%',
          },
          item: {
            flex: 1,
          },
        }}
        onItemClick={onPromptsItemClick}
      /> */}
    </Space>
  );
};
export default placeholderNode;
