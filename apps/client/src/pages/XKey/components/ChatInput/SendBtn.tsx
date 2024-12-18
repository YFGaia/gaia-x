import React from 'react';
import { RiSendPlaneFill, RiStopFill } from 'react-icons/ri';

interface SendBtnProps {
  isGenerating?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const SendBtn: React.FC<SendBtnProps> = ({ isGenerating, disabled, onClick }) => {
  const buttonClass = `send-button ${isGenerating ? "generating" : ""}`;

  return (
    <div 
      className={buttonClass} 
      onClick={disabled ? undefined : onClick}
    >
      {isGenerating ? <RiStopFill size={20} /> : <RiSendPlaneFill size={20} />}
      <span>{isGenerating ? "停止" : "发送"}</span>
    </div>
  );
};