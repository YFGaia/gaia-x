import { ChatChannel, ToolbarChannel } from '@/types/ipc/xKey';
import { CloudUploadOutlined, LinkOutlined } from '@ant-design/icons';
import { Attachments, Sender } from '@ant-design/x';
import { FooterRender } from '@ant-design/x/es/sender';
import { Badge, Button, Divider, Flex, Switch } from 'antd';
import { GetProp } from 'antd/es/_util/type';
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createStyles } from 'antd-style';
import PresetSelector from './PresetSelector';
import { Preset } from '@/types/xKey/types';
import { useChatContext } from '@/contexts/ChatContext';
import ContainerUpExpander from '@/components/ContainerUpExpander';
import ChatForm, { ChatFormRef } from './ChatForm';

interface ChatSenderProps {
  onSubmit: (content: string) => void;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
  onPresetChange?: (preset: Preset) => void;
}

export interface ChatSenderRef {
  setContent: (content: string) => void;
  getContent: () => string;
  clear: () => void;
}

const useStyle = createStyles(({ token, css }) => {
  return {
    container: css`
      position: relative;
      border-radius: ${token.borderRadiusLG}px;
      background: ${token.colorBgContainer};
    `,
    footer: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      border-top: 1px solid ${token.colorBorder};
    `,
    // ... 其他样式
  };
});

const ChatSender = memo(
  forwardRef<ChatSenderRef, ChatSenderProps>(
    ({ onSubmit, onCancel, loading, className, onPresetChange }, ref) => {
      const { styles } = useStyle();
      const [content, setContent] = useState('');
      const [ifShowForm, setIfShowForm] = useState(true);
      const ifShowFormRef = useRef<boolean>(true);
      const inputTextRef = useRef<string>('');
      const contentRef = useRef('');
      const chatFormRef = useRef<ChatFormRef>(null);
      const [headerOpen, setHeaderOpen] = React.useState(false);
      const [attachedFiles, setAttachedFiles] = React.useState<
        GetProp<typeof Attachments, 'items'>
      >([]);

      const { currentPreset } = useChatContext();

      // 暴露方法给外部
      useImperativeHandle(ref, () => ({
        setContent: (newContent: string) => setContent(newContent),
        getContent: () => content,
        clear: () => setContent(''),
      }));

      const handleSubmit = (value: string) => {
        onSubmit(value);
        setIfShowForm(false);
        ifShowFormRef.current = false;
        setContent('');
        contentRef.current = '';
      };

      const handleChange = (value: string) => {
        setContent(value);
        contentRef.current = value;
      };

      const handleFileChange: GetProp<typeof Attachments, 'onChange'> = (info) =>
        setAttachedFiles(info.fileList);

      useEffect(() => {
        const cleanTextSelected = window.ipcRenderer.on(
          ToolbarChannel.TEXT_SELECTED,
          (_: Electron.IpcRendererEvent, { text }: { text: string }) => {
            setContent(text?.trim());
          }
        );

        const cleanNewChat = window.ipcRenderer.on(
          ChatChannel.NEW_CHAT,
          (_: Electron.IpcRendererEvent, preset: Preset, conversationId: string) => {
            console.log('NEW_CHAT', preset, conversationId);
            setIfShowForm(true);
            ifShowFormRef.current = true;
          }
        );

        return () => {
          cleanTextSelected();
          cleanNewChat();
        };
      }, []);

      const attachmentsNode = (
        <Badge dot={attachedFiles.length > 0 && !headerOpen}>
          {/* <Button type="text" icon={<PaperClipOutlined />} onClick={() => setHeaderOpen(!headerOpen)} /> */}
        </Badge>
      );

      const senderHeader = (
        <Sender.Header
          title="Attachments"
          open={headerOpen}
          onOpenChange={setHeaderOpen}
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Attachments
            beforeUpload={() => false}
            items={attachedFiles}
            onChange={handleFileChange}
            placeholder={(type) =>
              type === 'drop'
                ? { title: '将文件拖入此处' }
                : {
                    icon: <CloudUploadOutlined />,
                    title: '上传文件',
                    description: '点击或拖动文件到此处上传',
                  }
            }
          />
        </Sender.Header>
      );

      const senderFooter = ({ components }: { components: any }) => {
        const { SendButton, LoadingButton } = components;
        return (
          <Flex justify="space-between" align="center">
            <Flex gap="small" align="center">
              <PresetSelector onPresetChange={onPresetChange} />
            </Flex>
            <Flex align="center">
              {loading ? <LoadingButton type="default" /> : <SendButton type="primary" />}
            </Flex>
          </Flex>
        );
      };

      return (
        <>
          {currentPreset?.userInputForm && currentPreset?.userInputForm.length > 0 && (
            <ContainerUpExpander
              title="查看表单"
              buttonWidth={110}
              buttonAlign="left"
              defaultExpanded={true}
              expanded={ifShowForm}
              onExpandChange={(expanded) => setIfShowForm(expanded)}
            >
              <ChatForm
                preset={currentPreset}
                inputText={inputTextRef.current}
                ref={chatFormRef}
                onEntryVariableChange={handleChange}
              />
            </ContainerUpExpander>
          )}
          <div className={`${styles.container} ${className}`}>
            <Sender
              header={senderHeader}
              value={content}
              actions={false}
              onSubmit={handleSubmit}
              onChange={handleChange}
              onCancel={onCancel}
              loading={loading}
              className={className}
              prefix={attachmentsNode}
              footer={senderFooter}
            />
          </div>
        </>
      );
    }
  )
);

export default ChatSender;
