import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import ReactMarkdown from 'react-markdown';
import { createRoot } from 'react-dom/client';

interface ConfirmProps {
  content: string;
  title?: string;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  okText?: string;
  cancelText?: string;
  width?: number;
  centered?: boolean;
  className?: string;
  maskClosable?: boolean;
}

// 基础组件
export const RenderConfirm: React.FC<ConfirmProps> & {
  show: (props: ConfirmProps) => JSX.Element;
  confirm: (props: ConfirmProps) => Promise<boolean>;
} = ({
  content,
  title = '确认',
  onOk,
  onCancel,
  okText = '确定',
  cancelText = '取消',
  width = 420,
  centered = true,
  className = '',
  maskClosable = false,
}) => {
  // 控制 Modal 显示状态
  const [visible, setVisible] = useState(true);
  // 加载状态（用于异步操作）
  const [loading, setLoading] = useState(false);

  // 处理组件卸载
  useEffect(() => {
    return () => {
      setVisible(false);
      setLoading(false);
    };
  }, []);

  // 处理确认
  const handleOk = async () => {
    try {
      setLoading(true);
      await onOk?.();
      setVisible(false);
    } catch (error) {
      console.error('Confirm operation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理取消
  const handleCancel = async () => {
    try {
      setLoading(true);
      await onCancel?.();
      setVisible(false);
    } catch (error) {
      console.error('Cancel operation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={title}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={okText}
      cancelText={cancelText}
      width={width}
      centered={centered}
      className={className}
      maskClosable={maskClosable}
      confirmLoading={loading}
      destroyOnClose
    >
      <div className="markdown-content">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </Modal>
  );
};

// JSX 方式调用
RenderConfirm.show = (props: ConfirmProps): JSX.Element => {
  return <RenderConfirm {...props} />;
};

// Promise 方式调用
RenderConfirm.confirm = (props: ConfirmProps): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    const root = createRoot(container);

    const destroy = () => {
      root.unmount();
      container.remove();
    };

    const handleOk = async () => {
      try {
        await props.onOk?.();
        resolve(true);
      } catch (error) {
        reject(error);
      } finally {
        destroy();
      }
    };

    const handleCancel = async () => {
      try {
        await props.onCancel?.();
        resolve(false);
      } catch (error) {
        reject(error);
      } finally {
        destroy();
      }
    };

    root.render(
      <RenderConfirm
        {...props}
        onOk={handleOk}
        onCancel={handleCancel}
      />
    );
  });
};

// // 导出类型
// export type { ConfirmProps };

// import React from 'react';
// import { RenderConfirm } from '../RenderConfirm';

// export const Example: React.FC = () => {
//   // 1. 组件方式使用
//   const renderAsComponent = () => {
//     return (
//       <RenderConfirm
//         content="这是一个确认框"
//         onOk={() => console.log('确认')}
//         onCancel={() => console.log('取消')}
//       />
//     );
//   };

//   // 2. JSX 方法方式使用
//   const renderAsJSX = () => {
//     return (
//       <div>
//         {RenderConfirm.show({
//           content: "这是一个确认框",
//           onOk: () => console.log('确认'),
//           onCancel: () => console.log('取消')
//         })}
//       </div>
//     );
//   };

//   // 3. Promise 方式使用
//   const handleConfirm = async () => {
//     try {
//       const confirmed = await RenderConfirm.confirm({
//         content: "这是一个确认框",
//         title: "操作确认"
//       });
      
//       if (confirmed) {
//         console.log('用户确认了操作');
//       } else {
//         console.log('用户取消了操作');
//       }
//     } catch (error) {
//       console.error('操作出错:', error);
//     }
//   };

//   return (
//     <div>
//       <button onClick={handleConfirm}>显示确认框</button>
//     </div>
//   );
// };