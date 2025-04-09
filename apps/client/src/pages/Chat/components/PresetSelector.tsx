import { Preset } from '@/types/xKey/types';
import { Select } from 'antd';
import React from 'react';
import { usePresetSelection } from '@/hooks/usePresetSelection';
import { useChatContext } from '@/contexts/ChatContext';

interface PresetSelectorProps {
  className?: string;
  onPresetChange?: (preset: Preset) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ 
  className,
  onPresetChange 
}) => {
  const {
    presets,
    isDisabled,
    currentPreset,
    handlePresetChange
  } = usePresetSelection({
    onPresetChange
  });

  if (presets.length === 0) {
    return null;
  }

  return (
    <Select
      className={className}
      style={{ minWidth: 100 }}
      disabled={isDisabled}
      size="small"
      value={currentPreset?.id}
      onChange={handlePresetChange}
      options={presets.map((preset) => ({
        label: preset.title,
        value: preset.id,
      }))}
    />
  );
};

export default PresetSelector; 