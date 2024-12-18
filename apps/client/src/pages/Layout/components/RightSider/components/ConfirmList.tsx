import { RenderConfirmView } from '@/components/RenderConfirm';
import { useAppStateStore } from '@/stores/AppStateStore';
import { useConversationStore } from '@/stores/ConversationStore';
import { useMcpToolStore } from '@/stores/McpToolStore';
import { useRenderConfirmStore } from '@/stores/RenderConfirmStore';
import { SessionChannel } from '@/types/ipc/session';
import { Button } from 'antd';
import { motion } from 'framer-motion';
let index = 0;
const ConfirmList: React.FC = () => {
  const { confirms, waitResult, clearConfirm } = useRenderConfirmStore();
  const { activeKey } = useConversationStore();
  const { servers } = useMcpToolStore();

  const addMarkdown = async () => {
    index++;
    // 这样是直接创建一个确定框，并且等待结果
    const res = await waitResult({
      conversationId: activeKey,
      chatId: activeKey,
      item: {
        id: index.toString(),
        // content: '## 5. 表格展示',
        content: ' 调用参数 \n ```bash\nls\n```',
        type: 'markdown',
        result: '',
        title: '是否调用api插件',
      },
    });
    // 这样是创建一个渲染框，然后不需要确定（或者说默认直接确定通过的）,注意：这里需要设置result为ok
    // const res1 = await addConfirm({
    //     conversationId: '1',
    //     chatId: '1',
    //     item: {
    //         id: index.toString(),
    //         content: ' 调用参数 \n ```bash\nls\n```',
    //         type: 'markdown',
    //         result: 'ok',
    //         title: '是否调用api插件',
    //     }
    // });
    console.log(res);
  };

  const addHtml = async () => {
    index++;
    const res = await waitResult({
      conversationId: '1',
      chatId: '1',
      item: {
        id: index.toString(),
        content: '<h1>Hello, World!</h1><script>console.log("Hello, World!")</script>',
        type: 'html',
        result: '',
        title: '是否调用api插件',
      },
    });
    console.log(res);
  };

  const testRemote = async () => {
    const cookies = [
      {
        url: '',
        name: 'sessionid',
        value: 'ah7iu8azuwk4k89rsts0rj3zy2a6fkyz',
        domain: '',
      },
    ];
    await window.ipcRenderer.invoke(SessionChannel.SET_SESSION, {
      partition: '',
      cookies: cookies,
    });
    console.log(11)
    await useAppStateStore
      .getState()
      .setMode('remote', 'https://gaia-x.cn/terminal/info?type=1&id=4141');
      console.log(22)
  };

  return (
    <div className="space-y-4 bg-white h-full px-4 overflow-y-auto">
      <Button onClick={addMarkdown}>addMarkdown</Button>
      <Button onClick={addHtml}>addHtml</Button>
      <Button onClick={addMarkdown}>addText</Button>
      <Button onClick={addMarkdown}>addJson</Button>
      <Button onClick={testRemote}>testRemote</Button>
      <Button onClick={clearConfirm}>clear</Button>
      <Button onClick={() => {
        console.log(servers)
      }}>showTools</Button>
      {confirms.filter((confirm) => confirm.conversationId === activeKey).map((confirm) => (
        <motion.div key={confirm.item.id} exit={{ opacity: 0 }}>
          <RenderConfirmView {...confirm} />
        </motion.div>
      ))}
    </div>
  );
};

export default ConfirmList;
