import { VersionService } from '@/services/VersionService';
import { UtilsChannel } from '@/types/ipc/utils';
import { useEffect, useState } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import './settings.css'

const About = () => {
  // 版本号
  const [version, setVersion] = useState<string>('');
  const handleCheckUpdate = async () => {
    await VersionService.checkUpdate(true);
  };

  useEffect(() => {
    // 获取版本号
    const getAppVersion = async () => {
      const appVersion = await window.ipcRenderer.invoke(UtilsChannel.APP_VERSION);
      setVersion(appVersion);
    };
    getAppVersion();
  }, []);

  return (
    <div>
      <h3>使用说明</h3>
      <p>{'聊天框，自带划词弹出工具条，可以指定智能体发送选中的文本'}</p>
      <div className="version-info" style={{ margin: '10px 0', color: '#666' }}>
        当前版本：{version}
      </div>
      <div className="option" onClick={handleCheckUpdate}>
        <RiRefreshLine />
        检查更新
      </div>
    </div>
  );
};

export default About;
