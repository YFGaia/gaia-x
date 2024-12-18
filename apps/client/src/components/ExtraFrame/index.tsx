import { useRemoteStore } from "@/stores/RemoteStore";
import { useRef, useState } from "react";

interface ExtraFrameProps {
  url: string;
}

export const ExtraFrame: React.FC<ExtraFrameProps> = ({ url }) => {
  const webviewRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setLoaded } = useRemoteStore();
  const handleLoad = () => {
    try {
      const iframe = webviewRef.current;
      setLoading(false);
      // 尝试聚焦 iframe
      iframe?.focus();

      // 尝试聚焦 iframe 内的文档
      iframe?.contentWindow?.focus();
      setLoaded(true);
      // 阻止所有可能的事件
      const preventDefault = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };

      // 需要阻止的事件列表
      const events = [
        "mousedown",
        "mouseup",
        "click",
        "dblclick",
        "keydown",
        "keyup",
        "keypress",
        "touchstart",
        "touchend",
        "touchmove",
        "wheel",
        "contextmenu",
      ];

      // 添加事件监听
      events.forEach((event) => {
        iframe?.addEventListener(event, preventDefault, { capture: true });
      });

      // 清理函数
      return () => {
        events.forEach((event) => {
          iframe?.removeEventListener(event, preventDefault, { capture: true });
        });
      };
    } catch (e) {
      console.warn("Failed to focus iframe:", e);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* 加载状态指示器 */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="h-1 bg-blue-500 animate-pulse" />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <iframe
        ref={webviewRef}
        src={url}
        className="w-full h-full absolute inset-0"
        onLoad={handleLoad}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: "none",
          pointerEvents: "none",
        }}
        // sandbox 权限
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        // 剪贴板权限
        allow="clipboard-read; clipboard-write"
      ></iframe>
    </div>
  );
};
