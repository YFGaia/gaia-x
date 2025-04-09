import { useRenderConfirmStore } from '@/stores/RenderConfirmStore';
import { ThoughtChainItemExpand, ThoughtChainItemExpandStatus } from '@/types/chat';
import {
    CaretRightOutlined,
    CheckCircleTwoTone,
    InfoCircleTwoTone,
    LoadingOutlined
} from '@ant-design/icons';
import { Button, Collapse, CollapseProps, theme } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import { AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';
import { useShallow } from 'zustand/react/shallow';

interface ToolThoughtChainProps {
  thought: ThoughtChainItemExpand;
  id: string;
}

const useStyle = createStyles(({ token, css }) => ({
  thoughtChain: css`
    padding: 16px;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    text-align: left;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  `,
  toolContentWrapper: css`
    padding: 16px;
    text-align: left;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    margin-top: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

    .title {
      margin: 0 0 12px;
      font-weight: 500;
      color: ${token.colorTextSecondary};
      font-size: 14px;
    }

    .code-block {
      margin: 12px 0;
      padding: 16px;
      background: ${token.colorBgElevated};
      border-radius: ${token.borderRadiusLG}px;
      border: 1px solid ${token.colorBorder};
      overflow-x: auto;
      font-family: ${token.fontFamilyCode};
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .error {
      color: ${token.colorError};
    }
  `,
}));

function getStatusIcon(status: ThoughtChainItemExpandStatus) {
  switch (status) {
    case 'success':
      return <CheckCircleTwoTone twoToneColor="#52c41a" />;
    case 'error':
      return <InfoCircleTwoTone twoToneColor="#ff4d4f" />;
    case 'running':
    case 'pending':
      return <LoadingOutlined twoToneColor="#1890ff" />;
    default:
      return undefined;
  }
}

const renderToolContent = (
  requestContent: any,
  responseContent: any,
  isError: boolean = false,
  styles: any
) => {
  return (
    <div className={styles.toolContentWrapper}>
      <p className="title">
        <strong>请求:</strong>
      </p>
      <pre className="code-block">
        {typeof requestContent === 'string'
          ? requestContent
          : JSON.stringify(requestContent, null, 2)}
      </pre>
      <p className="title">
        <strong>响应:</strong>
      </p>
      <pre className={`code-block ${isError ? 'error' : ''}`}>
        {typeof responseContent === 'string'
          ? responseContent
          : JSON.stringify(responseContent, null, 2)}
      </pre>
    </div>
  );
};

const getLabel = (
  thought: ThoughtChainItemExpand,
  setOk: (e: React.MouseEvent) => void,
  setCancel: (e: React.MouseEvent) => void
) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-1">
        <div className="font-bold">
          {getStatusIcon(thought.status)} <span className="ml-1">{thought.title}</span>
        </div>
        <div>{thought.description}</div>
      </div>
      {thought.status === 'pending' && (
        <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
          <Button variant="filled" color="primary" icon={<AiOutlineCheck />} onClick={setOk}>
            执行
          </Button>
          <Button variant="filled" color="default" icon={<AiOutlineClose />} onClick={setCancel}>
            取消
          </Button>
        </div>
      )}
    </div>
  );
};

const getItems = (
  thought: ThoughtChainItemExpand,
  setOk: (e: React.MouseEvent) => void,
  setCancel: (e: React.MouseEvent) => void
): CollapseProps['items'] => [
  {
    key: '1',
    label: getLabel(thought, setOk, setCancel),
    children: thought.content,
  },
];

const ToolThought: React.FC<ToolThoughtChainProps> = ({ thought, id }) => {
  const { token } = theme.useToken();
  const { styles } = useStyle();
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const confirm = useRenderConfirmStore(useShallow((state) => state.getMessageItemConfirm(id)));
  const { setResult } = useRenderConfirmStore();


  if (!thought) return null;

  thought.content = renderToolContent(
    thought.requestContent,
    thought.responseContent,
    thought.isError,
    styles
  );

  useEffect(() => {
    if (thought.status == 'pending') {
        setActiveKeys(['1']);
    }
  }, [])

  const setCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm) {
        confirm.item.result = 'cancel';
        setActiveKeys([]); // 关闭面板
        setResult(confirm);
    }
  };

  const setOk = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm) {
        confirm.item.result = 'ok';
        thought.status = 'running';
        setActiveKeys([]); // 关闭面板
        setResult(confirm);
    }
  };

  // 处理面板展开/收起
  const handleCollapseChange = (keys: string | string[]) => {
    setActiveKeys(typeof keys === 'string' ? [keys] : keys);
  };

  return (
    <Collapse
      bordered={false}
      activeKey={activeKeys}
      onChange={handleCollapseChange}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      style={{ background: token.colorBgContainer, paddingBottom: 12, paddingTop: 12 }}
      items={getItems(thought, setOk, setCancel)}
    />
  );
};

export default ToolThought;
