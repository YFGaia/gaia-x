import { Attachments, Sender, SenderProps } from '@ant-design/x';
import { GetProp } from 'antd/es/_util/type';
import React from 'react';
import { CloudUploadOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Badge } from 'antd';

const ChatSender: React.FC<SenderProps> = ({
  value: content,
  onSubmit,
  onChange,
  onCancel,
  loading,
  className,
}: SenderProps) => {
  const [headerOpen, setHeaderOpen] = React.useState(false);
  const [attachedFiles, setAttachedFiles] = React.useState<GetProp<typeof Attachments, 'items'>>(
    []
  );

  const handleFileChange: GetProp<typeof Attachments, 'onChange'> = (info) =>
    setAttachedFiles(info.fileList);

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
  return (
    <>
      <Sender
        header={senderHeader}
        value={content}
        onSubmit={onSubmit}
        onChange={onChange}
        onCancel={onCancel}
        loading={loading}
        className={className}
        prefix={attachmentsNode}
      />
    </>
  );
};

export default ChatSender;
