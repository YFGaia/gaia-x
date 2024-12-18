import React, { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from "use-debounce";

interface AutoGrowInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
  minRows?: number;
  maxLength?: number;
}

/** 获取dom内容宽度 */
function getDomContentWidth(dom: HTMLElement) {
  const style = window.getComputedStyle(dom);
  const paddingWidth =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const width = dom.clientWidth - paddingWidth;
  return width;
}

/** 获取用于测量尺寸的 dom */
function getOrCreateMeasureDom(id: string, init?: (dom: HTMLElement) => void) {
  let dom = document.getElementById(id);

  if (!dom) {
    dom = document.createElement("span");
    dom.style.position = "absolute";
    dom.style.wordBreak = "break-word";
    dom.style.fontSize = "16px";
    dom.style.lineHeight = "1.5";
    dom.style.transform = "translateY(-200vh)";
    dom.style.pointerEvents = "none";
    dom.style.opacity = "0";
    dom.style.padding = "9px 61px 9px 13px";
    dom.id = id;
    document.body.appendChild(dom);
    init?.(dom);
  }

  return dom!;
}

/** 自动增长输入框高度 */
function autoGrowTextArea(dom: HTMLTextAreaElement) {
  const measureDom = getOrCreateMeasureDom("__measure"); // 普通dom
  const singleLineDom = getOrCreateMeasureDom("__single_measure", (dom) => {
    dom.innerText = "TEXT_FOR_MEASURE";
  }); // 单行dom

  const width = getDomContentWidth(dom);
  measureDom.style.width = width + "px";
  measureDom.innerText = dom.value !== "" ? dom.value : "1";
  measureDom.style.fontSize = dom.style.fontFamily;
  measureDom.style.fontFamily = dom.style.fontFamily;
  const endWithEmptyLine = dom.value.endsWith("\n");
  const height = parseFloat(window.getComputedStyle(measureDom).height);
  const singleLineHeight = parseFloat(window.getComputedStyle(singleLineDom).height);
  const rows = Math.round(height / singleLineHeight) + (endWithEmptyLine ? 1 : 0);
  return rows;
}

export const AutoGrowInput: React.FC<AutoGrowInputProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled = false,
  maxRows = 4,
  minRows = 1,
  maxLength = 4096,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputRows, setInputRows] = useState(minRows);

  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : minRows;
      const calculatedRows = Math.min(maxRows, Math.max(minRows, rows));
      setInputRows(calculatedRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  useEffect(measure, [value, measure]);

  return (
    <textarea
      ref={inputRef}
      className="chat-input"
      style={{ paddingRight: "64px" }}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={inputRows}
      spellCheck={false}
      disabled={disabled}
      maxLength={maxLength}
    />
  );
};
