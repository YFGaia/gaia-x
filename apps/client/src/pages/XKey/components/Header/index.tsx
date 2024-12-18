import { ReactNode } from 'react';
import './header.css'
import { RiCloseFill } from "react-icons/ri";

interface HeaderProps {
  children?: ReactNode;
  onClose?: () => void;
}

/** 聊天窗口头部 */
export const Header = ({ children, onClose }: HeaderProps) => {
  return <div className="header">
    <div className="content-bar">
      <span className="flex-row">{children}</span>
      {/** Close Window */}
      <div className="btn" onClick={onClose}>
        <RiCloseFill className="icon" size={18} />
      </div>
    </div>
  </div>
}