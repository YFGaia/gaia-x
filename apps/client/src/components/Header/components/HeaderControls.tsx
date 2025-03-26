import { useAppStateStore } from '@/stores/AppStateStore';
// import { useViewStore } from '@/stores/ViewStore';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import {
  VscLayoutSidebarLeft,
  VscLayoutSidebarLeftOff,
  VscLayoutSidebarRight,
  VscLayoutSidebarRightOff,
  // VscSettingsGear,
  // VscComment,
} from 'react-icons/vsc';

const HeaderControls: React.FC = () => {
  const { leftPanel, rightPanel, setConfig, initConfig, mode } = useAppStateStore();
  // const { setView, currentView } = useViewStore();

  useEffect(() => {
    initConfig();
  }, []);

  const toggleLeftSiderBar = async () => {
    const newState = leftPanel == 'open' ? 'close' : 'open';
    await setConfig('leftPanel', newState);
    (document.activeElement as HTMLElement)?.blur();
  };
  const toggleRightSiderBar = async () => {
    const newState = rightPanel == 'open' ? 'close' : 'open';
    await setConfig('rightPanel', newState);
    (document.activeElement as HTMLElement)?.blur();
  };

  // const showSetting = () => {
  //   if (currentView != 'setting') {
  //     setView('setting');
  //     (document.activeElement as HTMLElement)?.blur();
  //   } else {
  //     setView('chat');
  //     (document.activeElement as HTMLElement)?.blur();
  //   }
  // };

  return (
    <div className="flex items-center">
      {mode == 'normal' && (
        <>
          <Button
            type="text"
            icon={leftPanel == 'open' ? <VscLayoutSidebarLeft /> : <VscLayoutSidebarLeftOff />}
            onClick={toggleLeftSiderBar}
          />
          {false && <Button
            type="text"
            icon={rightPanel == 'open' ? <VscLayoutSidebarRight /> : <VscLayoutSidebarRightOff />}
            onClick={toggleRightSiderBar}
          />}
          {/* <Button type="text" icon={currentView == 'setting' ? <VscComment /> : <VscSettingsGear />} onClick={showSetting} /> */}
        </>
      )}
    </div>
  );
};

export default HeaderControls;
