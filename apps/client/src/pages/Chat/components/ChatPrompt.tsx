import { FireOutlined, ReadOutlined } from '@ant-design/icons';
import { Prompts } from '@ant-design/x';
import { GetProp } from 'antd';

interface ChatPromptProps {
  onRequest: (key: string) => void;
}

const ChatPrompt: React.FC<ChatPromptProps> = ({ onRequest }) => {
  const onPromptsItemClick: GetProp<typeof Prompts, 'onItemClick'> = (info) => {
    onRequest(info.data.description as string);
  };

  const senderPromptsItems: GetProp<typeof Prompts, 'items'> = [
    {
      key: '1',
      description: '你是谁？',
      icon: <FireOutlined style={{ color: '#FF4D4F' }} />,
    },
    {
      key: '2',
      description: '查询 ./.git的git状态',
      icon: <ReadOutlined style={{ color: '#1890FF' }} />,
    },
    {
      key: '3',
      description: '打开豆瓣官网，并在豆瓣网进行搜索大脑的故事这本书，并调用工具进行相关操作',
      icon: <ReadOutlined style={{ color: '#1890FF' }} />,
    },
  ];
  return (
    <>
      {/* <Prompts items={senderPromptsItems} onItemClick={onPromptsItemClick} /> */}
    </>
  );
};

export default ChatPrompt;
