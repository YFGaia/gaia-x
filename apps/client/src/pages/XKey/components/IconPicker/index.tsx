import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import './index.css';
import * as RiIcons from 'react-icons/ri';
import debounce from 'lodash/debounce';
import { getIcon } from '../../assets/iconConfig';
import { Modal, Input, Button, Space, Tooltip, Card } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface IconPickerProps {
  isOpen: boolean;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

// 单个图标组件
const IconItem = React.memo<{
  iconName: string;
  isSelected: boolean;
  onClick: () => void;
}>(({ iconName, isSelected, onClick }) => (
  <Card
    hoverable
    size="small"
    className={`icon-item ${isSelected ? 'selected' : ''}`}
    onClick={onClick}
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isSelected ? 'var(--gxk-bg-color-active)' : 'transparent',
      padding: '0.5rem',
      cursor: 'pointer',
      height: '40px',
      width: '40px',
      border: isSelected ? '1px solid var(--gxk-color-ex1)' : '1px solid transparent'
    }}
  >
    <Tooltip title={iconName}>
      <div className="icon-display">
        {getIcon(iconName)}
      </div>
    </Tooltip>
  </Card>
));

/** 图标选择器，使用 Ant Design 组件 */
export const IconPicker: React.FC<IconPickerProps> = ({ isOpen, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIcon(null);
      setSearchTerm('');
      setVisibleCount(100);
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: 'instant',
        });
      }
    }
  }, [isOpen]);

  // 获取所有图标名称
  const allIconNames = useMemo(() => 
    Object.keys(RiIcons).filter(key => 
      key.startsWith('Ri') && typeof RiIcons[key as keyof typeof RiIcons] === 'function'
    ),
    []
  );

  // 根据搜索框文本过滤图标，无文本则显示全部图标
  const filteredIcons = useMemo(() => {
    if (!searchTerm) return allIconNames;
    return allIconNames.filter(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allIconNames]);

  const handleIconClick = (iconName: string) => {
    setSelectedIcon(iconName);
  };

  // Debounced search handler
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => setSearchTerm(value), 300),
    []
  );

  const handleConfirm = () => {
    if (selectedIcon) {
      onSelect(selectedIcon);
      onClose();
    }
  };

  // 处理滚动加载
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // 当滚动到距离底部20px时触发加载
    if (scrollHeight - scrollTop - clientHeight < 20) {
      setVisibleCount(prev => Math.min(prev + 100, filteredIcons.length));
    }
  }, [filteredIcons.length]);

  // 添加滚动监听
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, isOpen]);

  return (
    <Modal 
      open={isOpen} 
      onCancel={onClose} 
      title="选择图标"
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirm}
          disabled={!selectedIcon}
        >
          确定
        </Button>
      ]}
    >
      <div className="icon-picker">
        <div className="search-container">
          <Input
            placeholder="搜索图标"
            onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
        </div>
        <div className="icon-grid-container" ref={containerRef}>
          <div className="icon-grid">
            {filteredIcons.slice(0, visibleCount).map((iconName) => (
              <IconItem 
                key={iconName}
                iconName={iconName}
                isSelected={selectedIcon === iconName}
                onClick={() => handleIconClick(iconName)}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}; 