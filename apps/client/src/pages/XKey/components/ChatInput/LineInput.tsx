import React from 'react';

interface LineInputProps {
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  inputType?: 'text' | 'number';
}

export const LineInput: React.FC<LineInputProps> = ({
  value = '',
  onChange,
  onKeyDown,
  placeholder,
  disabled = false,
  maxLength = 1024,
  inputType = 'text',
}) => {
  return (
    <input
      className="chat-input single-line"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      spellCheck={false}
      disabled={disabled}
      maxLength={maxLength}
      type={inputType}
    />
  );
}; 