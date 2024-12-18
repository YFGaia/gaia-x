import { useAppStateStore } from "@/stores/AppStateStore";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";

interface Props {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftVisible: boolean;
  rightVisible: boolean;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  minCenterWidth?: number;
  minRightWidth?: number;
}

const ResizablePanels: React.FC<Props> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  leftVisible,
  rightVisible,
  defaultLeftWidth = 250,
  defaultRightWidth = 250,
  minLeftWidth = 170,
  minCenterWidth = 200,
  minRightWidth = 170,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mode = useAppStateStore((state) => state.mode);

  const [normalModeWidths, setNormalModeWidths] = useState({
    left: defaultLeftWidth,
    right: defaultRightWidth,
  });

  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const [startX, setStartX] = useState(0);
  const [startLeftWidth, setStartLeftWidth] = useState(0);
  const [startRightWidth, setStartRightWidth] = useState(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "left" | "right") => {
      e.preventDefault(); // 阻止默认事件
      setIsDragging(type);
      setStartX(e.clientX);
      setStartLeftWidth(leftWidth);
      setStartRightWidth(rightWidth);
    },
    [leftWidth, rightWidth]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const delta = e.clientX - startX;
      const containerWidth = containerRef.current.offsetWidth;

      if (isDragging === "left") {
        const newLeftWidth = startLeftWidth + delta;
        const availableSpace = containerWidth - (rightVisible ? rightWidth : 0);
        const maxLeftWidth = availableSpace - minCenterWidth;

        // 确保左侧面板在最小和最大值之间
        const clampedLeftWidth = Math.min(
          Math.max(newLeftWidth, minLeftWidth),
          maxLeftWidth
        );

        setLeftWidth(clampedLeftWidth);
      } else {
        const newRightWidth = startRightWidth - delta;
        const availableSpace = containerWidth - (leftVisible ? leftWidth : 0);
        const maxRightWidth = availableSpace - minCenterWidth;

        // 确保右侧面板在最小和最大值之间
        const clampedRightWidth = Math.min(
          Math.max(newRightWidth, minRightWidth),
          maxRightWidth
        );

        setRightWidth(clampedRightWidth);
      }
    },
    [
      isDragging,
      startX,
      startLeftWidth,
      startRightWidth,
      leftWidth,
      rightWidth,
      leftVisible,
      rightVisible,
      minLeftWidth,
      minCenterWidth,
      minRightWidth,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mode === "normal") {
      setLeftWidth(normalModeWidths.left);
      setRightWidth(normalModeWidths.right);
    } else {
      setNormalModeWidths({
        left: leftWidth,
        right: rightWidth,
      });
      const containerWidth = containerRef.current.offsetWidth;
      setLeftWidth(0);
      setRightWidth(containerWidth * 0.8);
    }
  }, [mode]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 计算中间面板的当前宽度
  const centerWidth = useMemo(() => {
    if (!containerRef.current) return 0;
    const totalWidth = containerRef.current.offsetWidth;
    const leftSpace = leftVisible ? leftWidth : 0;
    const rightSpace = rightVisible ? rightWidth : 0;
    return totalWidth - leftSpace - rightSpace;
  }, [leftVisible, rightVisible, leftWidth, rightWidth]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full relative  ${isDragging ? "select-none" : ""}`}
    >
      <div
        className={`h-full overflow-hidden ${
          isDragging ? "" : "transition-[width] duration-300"
        } ${mode === "remote" ? "!w-0" : leftVisible ? "" : "!w-0"}`}
        style={{ width: leftWidth }}
      >
        {leftPanel}
      </div>

      {leftVisible && (
        <div
          className={`w-1 h-full cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-600 ${
            isDragging === "left" ? "bg-blue-600" : ""
          }`}
          onMouseDown={(e) => handleMouseDown(e, "left")}
        />
      )}

      <div
        className="h-full overflow-hidden"
        style={{
          flex: "1 1 auto",
          minWidth: `${minCenterWidth}px`,
          width: centerWidth,
        }}
      >
        {centerPanel}
      </div>

      {rightVisible && (
        <div
          className={`w-1 h-full cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-600 ${
            isDragging === "right" ? "bg-blue-600" : ""
          }`}
          onMouseDown={(e) => handleMouseDown(e, "right")}
        />
      )}

      <div
        className={`h-full overflow-hidden ${
          isDragging ? "" : "transition-[width] duration-300"
        } ${rightVisible ? "" : "!w-0"}`}
        style={{ width: rightWidth }}
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanels;
