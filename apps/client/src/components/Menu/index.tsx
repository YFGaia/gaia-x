interface TopMenuProps {
  className?: string;
}

const TopMenu: React.FC<TopMenuProps> = ({
  className
}) => {
  return <div className={className} >Gaia-X</div>;
};

export default TopMenu;
