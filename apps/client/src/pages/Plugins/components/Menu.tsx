import { Collapse } from "antd";
import { createStyles } from "antd-style";

const useStyle = createStyles(() => ({
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
  },
  collapseItem: {
    borderRadius: 0,
  },
}));

const Menu: React.FC = () => {
  const { styles } = useStyle();
  const installedPlugins = <div>已安装</div>;

  const getCount = (type: string) => {
    return <div>1</div>;
  };
  const collapses = [
    {
      key: "1",
      label: "已安装",
      children: installedPlugins,
      extra: getCount("installed"),
      className: styles.collapseItem,
    },
    {
      key: "2",
      label: "未安装",
      children: <div>未安装</div>,
      extra: getCount("uninstalled"),
      className: styles.collapseItem,
    },
  ];
  return (
    <div>
      <Collapse
        items={collapses}
        size="small"
        className={`${styles.collapse} ddd rounded-none`}
      />
    </div>
  );
};

export default Menu;
