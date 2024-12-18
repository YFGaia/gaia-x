import { ExtraFrame } from "@/components/ExtraFrame";
import { useRemoteStore } from "@/stores/RemoteStore";
import { useEffect, useState } from "react";

const RemoteView: React.FC = () => {
    const url = useRemoteStore(state => state.url);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        // 等待过渡动画完成后再渲染 iframe
        const timer = setTimeout(() => {
            setShouldRender(true);
        }, 320); // 略大于 transition duration (300ms)

        return () => {
            clearTimeout(timer);
            setShouldRender(false);
        };
    }, []);

    if (!shouldRender) {
        return <div className="w-full h-full flex items-center justify-center">
            <div>Loading...</div>
        </div>;
    }

    return <div className="w-full h-full"><ExtraFrame url={url}/></div>
};

export default RemoteView;