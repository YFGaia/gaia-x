import { Message, ThoughtChainItemExpand, isChatError } from '@/types/chat';
import { UserOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { Collapse, GetProp, Typography } from 'antd';
import markdownit from 'markdown-it';
import { memo } from 'react';
import ChatPlaceholder from './ChatPlaceholder';
import ToolThought from './ToolThought';

const md = markdownit({ html: true, breaks: true });

const renderMarkdown = (content: string) => {
  if (isChatError(content)) {
    return <Typography.Text type="danger">{content}</Typography.Text>;
  }
  return (
    <Typography>
      <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
    </Typography>
  );
};

const fooAvatar = {
  color: '#f56a00',
  backgroundColor: '#fde3cf',
  marginTop: '7px',
};

const barAvatar = {
  color: '#fff',
  backgroundColor: '#87d068',
  marginTop: '7px',
};

interface MessageListProps {
  messages: Message[];
  messageThoughts: Record<string, ThoughtChainItemExpand>;
  roles: GetProp<typeof Bubble.List, 'roles'>;
  mode: string;
  onRequest: (content: string) => void;
}

const thinkingItems = (reasoning: string) => [
  {
    key: '1',
    label: '推理过程',
    children: (
      <div className="flex flex-row relative">
        <div className="w-[2px] bg-gray-300 rounded-full absolute left-0 top-0 bottom-0 min-h-full"></div>
        <pre className="pl-4 flex-1 text-wrap font-sans p-0 m-0">{reasoning}</pre>
      </div>
    ),
  },
];

const MessageList = memo(
  ({ messages, messageThoughts, roles, mode, onRequest }: MessageListProps) => {
    const items: GetProp<typeof Bubble.List, 'items'> = messages.map(
      ({ id, items, role, status }) => {
        return ({
          key: id,
          status,
          role,
          variant: 'filled',
          avatar:
            role === 'user'
              ? { icon: <UserOutlined />, style: fooAvatar }
              : { icon: <UserOutlined />, style: barAvatar },
          content:
            role === 'user' ? (
              items[0].content
            ) : (
              <div className="flex flex-col" key={id}>
                {items.map((item) => {
                  if (item.type === 'thought') {
                    return (
                      <ToolThought thought={messageThoughts[item.id]} key={item.id} id={item.id} />
                    );
                  } else if (item.type === 'message') {
                    return (
                      <Bubble
                        content={item.content}
                        key={item.id}
                        messageRender={renderMarkdown}
                        variant="borderless"
                      />
                    );
                  } else if (item.type === 'thinking') {
                    return (
                      <Collapse
                        key={`thinking-${item.id}`}
                        ghost
                        items={thinkingItems(item.content)}
                        accordion
                        defaultActiveKey={['1']}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ),
        });
      }
    );
    return (
      <Bubble.List
        items={
          items.length > 0
            ? items
            : mode === 'normal'
            ? [
                {
                  key: 'placeholder',
                  content: <ChatPlaceholder onRequest={onRequest} />,
                  variant: 'outlined',
                },
              ]
            : []
        }
        roles={roles}
        className="flex-1"
      />
    );
  }
);

export default MessageList;
