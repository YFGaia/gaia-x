import Markdown from '@/components/Render/Markdown';
import { RenderConfirm, useRenderConfirmStore } from '@/stores/RenderConfirmStore';
import { Button, Collapse, CollapseProps } from 'antd';
import { useEffect, useState } from 'react';
import { AiOutlineCheck, AiOutlineClose } from 'react-icons/ai';
import { Html } from '../Render/Html';

export interface ConfirmProps {
  id: string;
  type: 'cmd' | 'markdown' | 'html' | 'form' | 'install' | 'call';
  result: 'ok' | 'cancel' | '';
  content: string;
  title?: string;
  okText?: string;
  cancelText?: string;
  className?: string;
}

const defaultConfirmProps: ConfirmProps = {
  id: '',
  type: 'markdown',
  result: '',
  content: '',
  title: '提示',
  okText: '确定',
  cancelText: '取消',
  className: '',
};

type RenderConfirmShowType = 'modal' | 'render' | 'auto';

export const RenderConfirmView: React.FC<RenderConfirm> = (props: RenderConfirm) => {
  const [expand, setExpand] = useState(props.item.result === '');
  const { setResult } = useRenderConfirmStore();
  const setCancel = () => {
    //TODO 请求远程保存
    props.item.result = 'cancel';
    setResult(props);
  };

  const setOk = () => {
    //TODO 请求远程保存
    props.item.result = 'ok';
    setResult(props);
  };

  // 在应用关闭的时候，如果 result 为空，则设置为 cancel，防止后续显示有问题
  useEffect(() => {
    const beforeAppClose = async (event: BeforeUnloadEvent) => {
      if (props.item.result === '') {
        setCancel();
      }
    };
    window.addEventListener('beforeunload', beforeAppClose);
    return () => {
      window.removeEventListener('beforeunload', beforeAppClose);
    };
  }, []);

  const items: CollapseProps['items'] = [
    {
      key: props.item.id,
      label: (
        <div className="title font-bold ">
          {' '}
          {props.item.title}{' '}
          {props.item.result === 'ok' && <span className="text-blue-500">[√]</span>}{' '}
          {props.item.result === 'cancel' && <span className="text-red-500">[×]</span>}
        </div>
      ),
      children: [
        <div className="rounded-lg my-4 p-2" key={props.item.id}>
          {props.item.type === 'markdown' && <Markdown content={props.item.content} />}
          {props.item.type === 'call' && <Markdown content={props.item.content} />}
          {props.item.type === 'html' && <Html html={props.item.content} />}
        </div>,
      ],
    },
  ];
  const activeKeys = [props.item.result === '' ? props.item.id : ''];
  return (
    <div className="rounded-lg border border-[#F0F0F0] p-4  border-solid flex flex-col shadow-sm">
      <Collapse
        items={items}
        bordered={false}
        defaultActiveKey={activeKeys}
        expandIconPosition="end"
      />
      {props.item.result === '' && (
        <div className="footer self-end flex gap-2">
          <Button variant="filled" color="default" icon={<AiOutlineClose />} onClick={setCancel}>
            取消
          </Button>
          <Button variant="filled" color="primary" icon={<AiOutlineCheck />} onClick={setOk}>
            确定
          </Button>
        </div>
      )}
    </div>
  );
};
