import React, { useState } from 'react';
import './index.css';
import { Markdown } from '../Markdown';
import { RiFileCopyLine, RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import { ChatMessage } from '@/types/xKey/types';

interface ChatBubbleProps extends ChatMessage {
  reasoning?: string;
}

const isJsonString = (str: string): boolean => {
  try {
    const result = JSON.parse(str);
    return typeof result === 'object' && result !== null;
  } catch (e) {
    return false;
  }
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ content, role, timestamp, reasoning }) => {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const toggleReasoning = () => {
    setIsReasoningExpanded(!isReasoningExpanded);
  };

  const renderJsonContent = (jsonContent: string) => {
    try {
      const jsonObj = JSON.parse(jsonContent);
      return (
        <div className="json-content">
          {Object.entries(jsonObj).map(([key, value]) => (
            <div key={key} className="json-entry">
              <div className="json-key">{key}:</div>
              <div className="json-value">
                <Markdown content={typeof value === 'string' ? value : JSON.stringify(value, null, 2)} />
              </div>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return <Markdown content={content} />;
    }
  };

  return (
    <div className={`chat-bubble-wrapper ${role}`}>
      <div className="chat-timestamp-container">
        {timestamp && <div className="chat-timestamp">{timestamp}</div>}
        <button className="copy-button" onClick={handleCopy} title="复制原文">
          <RiFileCopyLine size={14} />
        </button>
      </div>
      <div className="chat-bubble" style={reasoning ? { padding: '12px 16px' } : { padding: '0 16px' }}>
        {reasoning && (
          <div className={`chat-reasoning ${isReasoningExpanded ? 'expanded' : 'collapsed'}`}>
            <button className="reasoning-header" onClick={toggleReasoning}>
              {isReasoningExpanded ? <RiArrowDownSLine size={14} /> : <RiArrowRightSLine size={14} />}
              {isReasoningExpanded ? (<span>推理过程</span>) : (
                <span className="reasoning-preview">
                  {reasoning.split('\n')[0].slice(0, 50)}
                  {reasoning.split('\n')[0].length > 50 ? '...' : ''}
                </span>
              )}
            </button>
            <div className="reasoning-content">
              {reasoning}
            </div>
          </div>
        )}
        <div className="chat-content">
          {isJsonString(content) ? renderJsonContent(content) : <Markdown content={content} />}
        </div>
      </div>
    </div>
  );
}; 