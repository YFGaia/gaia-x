import { Collapse } from "antd";
import { createStyles, css } from "antd-style";
import { useMcpToolStore } from '@/stores/McpToolStore';

const useStyle = createStyles(({ token }) => ({
  collapse: {
    // 移除所有圆角
    ".ant-collapse": {
      borderRadius: 0,
    },
    // 移除面板头部的圆角
    ".ant-collapse-item:first-child .ant-collapse-header": {
      borderRadius: 0,
    },
    // 移除最后一个面板的圆角
    ".ant-collapse-item:last-child .ant-collapse-header": {
      borderRadius: 0,
    },
    ".ant-collapse-content": {
      borderRadius: 0,
    },
    ".ant-collapse-item >.ant-collapse-content>.ant-collapse-content-box": {
      padding: 0,
    },
  },
  collapseItem: {
    borderRadius: 0,
  },
  tabItem: css`
    cursor: pointer;
    padding: 8px 16px;
    user-select: none;
    &:hover {
      background-color: ${token.colorBgTextHover};
    }
    &[aria-selected="true"] {
      background-color: ${token.colorPrimary};
      color: ${token.colorTextLightSolid};
      font-weight: 500;
    }
  `,
}));

const MenuItem: React.FC<{ name: string, active: boolean }> = ({ name, active }) => {
  const { styles } = useStyle();
  const { setSelectedServer } = useMcpToolStore();
  return (
    <div 
      className={styles.tabItem}
      aria-selected={active}
      onClick={() => setSelectedServer(name)}
    >
      {name}
    </div>
  );
};

const Menu: React.FC = () => {
  const { styles } = useStyle();
  const { servers, selectedServer, setSelectedServer } = useMcpToolStore();

  const serverNameList = Array.from(servers.keys());


  const getCount = (type: string) => {
    if (type === "installed") {
      return <div>{servers.size}</div>;
    } else {
      return <div>0</div>;
    }
  };
  const collapses = [
    {
      key: "1",
      label: "已安装",
      children: (
        <div className="flex flex-col">
          {serverNameList.map((name, index) => (
            <MenuItem key={index} name={name} active={name === selectedServer} />
          ))}
        </div>
      ),
      extra: getCount("installed"),
      className: styles.collapseItem,
    },
    {
      key: "2",
      label: "推荐安装",
      children: <div onClick={() => setSelectedServer()} className="cursor-pointer p-2">自定义安装</div>,
      extra: getCount("uninstalled"),
      className: styles.collapseItem,
    },
  ];
  return (
    <div>
      <Collapse
        defaultActiveKey={['1', '2']}
        items={collapses}
        size="small"
        style={{
          padding: 0,
        }}
        className={`${styles.collapse} ddd rounded-none`}
      />
    </div>
  );
};

export default Menu;
