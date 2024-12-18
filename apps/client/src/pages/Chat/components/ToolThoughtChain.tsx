import React from 'react';
import { ThoughtChain as AntThoughtChain } from '@ant-design/x';
import type { ThoughtChainItem } from '@ant-design/x';
import { createStyles } from 'antd-style';
import { ThoughtChainItemExpand } from '@/types/chat';
import { CheckCircleOutlined, InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';

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

interface ToolThoughtChainProps {
  thought: ThoughtChainItemExpand;
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

function getStatusIcon(status: ThoughtChainItem['status']) {
  switch (status) {
    case 'success':
      return <CheckCircleOutlined />;
    case 'error':
      return <InfoCircleOutlined />;
    case 'pending':
      return <LoadingOutlined />;
    default:
      return undefined;
  }
}

const ToolThoughtChain: React.FC<ToolThoughtChainProps> = ({ thought }) => {
  const { styles } = useStyle();
  if (!thought) return null;
  thought.content = renderToolContent(
    thought.requestContent,
    thought.responseContent,
    thought.isError,
    styles
  );
  thought.icon = getStatusIcon(thought.iconStr);
  const thoughts = [thought];

  return (
    <div className={styles.thoughtChain}>
      <AntThoughtChain items={thoughts} size="small" collapsible />
    </div>
  );
};

export default ToolThoughtChain;
