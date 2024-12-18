import Header from "@/components/Header";
import ResizablePanels from "@/components/ResizablePanels";
import { useAppStateStore } from "@/stores/AppStateStore";
import { Layout as AntLayout } from "antd";
import React from "react";
import LeftSider from "./components/LeftSider";
import MainContent from "./components/MainContent";
import RightSider from "./components/RightSider";

const { Header: AntHeader, Content } = AntLayout;

const Layout: React.FC = () => {
  const { leftPanel, rightPanel, mode } = useAppStateStore();
  return (
    <AntLayout className="h-screen w-screen bg-white">
      <AntHeader className="bg-white border-0 dark:bg-[#1F1F1F] border-b h-[34px] px-0 border-solid border-b-gray-200">
        <Header />
      </AntHeader>
      <Content className="app-region-no-drag">
        <ResizablePanels
          leftPanel={<LeftSider />}
          centerPanel={<MainContent />}
          rightPanel={<RightSider />}
          leftVisible={leftPanel === 'open' && mode == "normal"}
          rightVisible={ mode != 'mini' && (rightPanel === 'open' || mode != "normal") && false}
          defaultLeftWidth={170}
          defaultRightWidth={280}
          minLeftWidth={170}
          minCenterWidth={200}
          minRightWidth={240}
        />
      </Content>
    </AntLayout>
  );
};

export default Layout;
