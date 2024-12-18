import React, { useState, useRef, useEffect } from 'react';
import { Card, Space, Button, Flex, Typography } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

interface ContainerUpExpanderProps {
  title: React.ReactNode;
  children: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  buttonWidth?: number | string; // 控制按钮宽度
  buttonAlign?: 'left' | 'center' | 'right'; // 控制按钮对齐方式
  expanded?: boolean; // 受控模式：控制是否展开
  defaultExpanded?: boolean; // 非受控模式：初始展开状态
  onExpandChange?: (expanded: boolean) => void; // 展开状态变化回调
}

const ContainerUpExpander: React.FC<ContainerUpExpanderProps> = ({
  title,
  children,
  wrapperStyle = {},
  headerStyle = {},
  contentStyle = {},
  buttonWidth,
  buttonAlign = 'center',
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandChange,
}) => {
  // 处理受控和非受控模式
  const isControlled = controlledExpanded !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // 实际使用的expanded状态
  const expanded = isControlled ? controlledExpanded : internalExpanded;
  
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 当受控模式下的expanded属性变化时，同步更新内部状态（用于处理父组件直接更新expanded值的情况）
  useEffect(() => {
    if (isControlled && internalExpanded !== controlledExpanded) {
      setInternalExpanded(controlledExpanded);
    }
  }, [controlledExpanded, isControlled, internalExpanded]);
  
  // 计算Flex容器的对齐方式
  const justifyContent = 
    buttonAlign === 'left' ? 'flex-start' :
    buttonAlign === 'right' ? 'flex-end' : 'center';
  
  // 计算按钮实际宽度(像素或百分比)
  const buttonWidthValue = buttonWidth || '100%';

  // 测量内容高度
  useEffect(() => {
    if (expanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, children]);
  
  // 处理展开/收起状态变化
  const handleToggle = () => {
    const newExpandedState = !expanded;
    
    // 更新内部状态（始终更新，即使是受控模式也要更新，以保持一致性）
    setInternalExpanded(newExpandedState);
    
    // 调用回调函数（如果提供了）
    if (onExpandChange) {
      onExpandChange(newExpandedState);
    }
  };
  
  return (
    <Space 
      direction="vertical" 
      className="container-up-expander" 
      style={{ 
        position: 'relative',
        width: '100%',
        ...wrapperStyle
      }}
      size={0}
    >
      <AnimatePresence>
        {expanded && (
          <motion.div
            ref={contentRef}
            initial={{ height: 0, opacity: 0, y: 0 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              bottom: '100%', // 放置在按钮上方
              left: 0,
              width: '100%',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <Card
              styles={{
                body: {
                  padding: '16px',
                },
              }}
              variant="outlined"
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderBottom: 'none',
                marginBottom: '-1px', // 确保与按钮边框无缝连接
                ...contentStyle
              }}
            >
              {children}
            </Card>
            
            {/* 添加底部边框，但按钮位置处不显示边框 */}
            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '1px',
                background: '#f0f0f0',
                zIndex: 2,
              }}
            >
              {/* 空白区域覆盖在按钮上方位置，隐藏边框 */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: buttonAlign === 'right' ? 'auto' : buttonAlign === 'center' ? `calc(50% - ${typeof buttonWidthValue === 'number' ? buttonWidthValue/2 + 'px' : buttonWidthValue === '100%' ? '50%' : `calc(${buttonWidthValue})/2`})` : 0,
                  right: buttonAlign === 'right' ? 0 : 'auto',
                  width: buttonWidthValue,
                  height: '1px',
                  background: '#fff',
                  zIndex: 3,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Flex justify={justifyContent} style={{ width: '100%', position: 'relative', zIndex: 101 }}>
        <Button
          type="text"
          onClick={handleToggle}
          style={{
            padding: '12px 16px',
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: expanded ? '0 0 8px 8px' : '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: buttonWidthValue,
            position: 'relative',
            zIndex: expanded ? 102 : 'auto', // 确保按钮始终在内容上方
            ...headerStyle
          }}
        >
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Typography.Text>{title}</Typography.Text>
            {expanded ? <DownOutlined /> : <UpOutlined />}
          </Flex>
        </Button>
      </Flex>
    </Space>
  );
};

export default ContainerUpExpander;