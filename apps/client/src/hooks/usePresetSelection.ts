import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversationStore } from '@/stores/ConversationStore';
import { Preset } from '@/types/xKey/types';
import { SettingChannel } from '@/types/ipc/xKey';
import { useChatContext } from '@/contexts/ChatContext';

interface UsePresetSelectionOptions {
  onPresetChange?: (preset: Preset) => void;
}

export const usePresetSelection = (options?: UsePresetSelectionOptions) => {
  // 状态管理
  const [presetId, setPresetId] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const presetsRef = useRef<Preset[]>([]);

  const { messages, currentPreset, presets, setCurrentPreset, findPreset } = useChatContext();

  // 监听消息变化来决定是否禁用选择器
  useEffect(() => {
    setIsDisabled(messages.length > 0);
  }, [messages]);

  // 处理preset变更
  const handlePresetChange = useCallback(
    (newPresetId: string) => {
      console.log('handlePresetChange', newPresetId);
      const preset = findPreset(newPresetId);
      console.log('preset', preset);
      if (preset) {
        setPresetId(newPresetId);
        setCurrentPreset(preset);
        options?.onPresetChange?.(preset);
      }
    },
    [options]
  );

  return {
    presetId,
    presets,
    isDisabled,
    currentPreset,
    handlePresetChange,
    // 暴露一些工具方法
    utils: {
      findPreset,
    },
  };
};
