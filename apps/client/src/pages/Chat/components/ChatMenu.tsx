import { useConversation } from '@/hooks/Conversion';
import { useConversationStore } from '@/stores/ConversationStore';
import { DeleteOutlined } from '@ant-design/icons';
import { Conversations, ConversationsProps } from '@ant-design/x';
import { App, Button, message, Modal } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect } from 'react';
import { AiOutlineDelete, AiOutlineForm } from 'react-icons/ai';

const useStyle = createStyles(({ token, css }) => {
  return {
    menu: css`
      width: 100%;
      height: 100%;
      flex-direction: column;
    `,
    conversations: css`
      overflow: hidden;
      padding: 0 12px;
      margin: 0;
      display: flex;
      height: calc(100vh - 126px);
      overflow-y: auto;
      .ant-conversations-item {
        span {
          /* 折叠历史记录时避免因为自动换行导致布局抖动 */
          text-wrap: nowrap;
        }
      }
    `,
    logo: css`
      display: flex;
      height: 72px;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;

      img {
        width: 24px;
        height: 24px;
        display: inline-block;
      }

      span {
        display: inline-block;
        margin: 0 8px;
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    btns: css`
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 2px 12px;
      gap: 10px;
    `,
  };
});

const ChatMenu: React.FC = () => {
  const { styles } = useStyle();
  const { conversations, activeKey } = useConversationStore();
  const [modal, contextHolder] = Modal.useModal();
  const {
    clearConversation,
    newConversation,
    fetchConversations,
    changeConversation,
    deleteConversation,
  } = useConversation();

  useEffect(() => {
    fetchConversations();
    // 创建样式元素
    const style = document.createElement('style');
    style.innerHTML = `
      .ant-tooltip {
        display: none !important;
      }
    `;

    // 添加到文档头部
    document.head.appendChild(style);

    // 组件卸载时移除样式
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
      {
        label: '删除',
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
      },
    ],
    onClick: (menuInfo) => {
      menuInfo.domEvent.stopPropagation();
      if (menuInfo.key === 'delete') {
        modal.confirm({
          title: '确定删除该会话吗？',
          onOk: () => deleteConversation(conversation.key),
        });
      }
    },
  });

  const confirmRemoveConversation = () => {
    modal.confirm({
      title: '清空全部会话吗？',
      onOk: () => clearConversation(),
    });
  };

  return (
    <>
      {contextHolder}
      <div className={styles.menu}>
        {/* 🌟 添加会话 */}
        <div className={styles.btns}>
          <Button
            size="large"
            icon={<AiOutlineDelete fontSize={20} />}
            type="text"
            onClick={confirmRemoveConversation}
          ></Button>
          <Button
            size="large"
            onClick={newConversation}
            icon={<AiOutlineForm fontSize={20} />}
            type="text"
          ></Button>
        </div>
        {/* 🌟 会话管理 */}
        <Conversations
          items={conversations}
          className={`${styles.conversations}`}
          menu={menuConfig}
          activeKey={activeKey}
          onActiveChange={changeConversation}
        />
      </div>
    </>
  );
};

export default ChatMenu;
