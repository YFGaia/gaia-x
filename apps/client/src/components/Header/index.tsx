import { Logo } from "../Logo";
import TopMenu from "../Menu";
import WindowControls from "../WindowControls";
import HeaderControls from "./components/HeaderControls";

const Header: React.FC = () => {
  return (
    <div className="flex justify-between h-[34px] items-center app-region-drag">
      <div className="flex items-center">
        <Logo size="small" className="mx-2" />
        {/* <TopMenu className="ml-2 text-sm" /> */}
      </div>
      <div className="flex items-center app-region-no-drag">
        <HeaderControls />
        <WindowControls />
      </div>
    </div>
  );
};

export default Header;
