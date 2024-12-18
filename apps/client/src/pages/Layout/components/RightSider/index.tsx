import { useAppStateStore } from "@/stores/AppStateStore";
import ConfirmList from "./components/ConfirmList";
import RemoteView from "./components/RemoteView";

const RightSider: React.FC = () => {
    const { mode } = useAppStateStore();
    return <div className="w-full h-full">
        {mode == "normal" && <ConfirmList />}
        {mode == "remote" && <RemoteView />}
    </div>
}

export default RightSider;