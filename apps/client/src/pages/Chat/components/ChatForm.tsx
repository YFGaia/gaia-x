import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Space, Typography } from 'antd';
import { Preset, UserInput } from '@/types/xKey/types';

const { TextArea } = Input;
const { Title } = Typography;

// 表单引用类型定义
export interface ChatFormRef {
  getValues: () => Promise<Record<string, any>>;
  submit: () => void;
}

interface ChatFormProps {
  preset: Preset;
  onSubmit?: (values: Record<string, any>) => void;
  inputText?: string;
  onEntryVariableChange?: (value: string) => void;
}

interface FormField {
  type: string;
  variable: string;
  label: string;
  required: boolean;
  default: string | number;
  max_length?: number;
  options?: Array<{ label: string; value: string }>;
}

// 提取字段转换函数为纯函数，避免组件内部的循环引用
const transformFields = (preset: Preset | null): FormField[] => {
  if (!preset?.userInputForm || preset.userInputForm.length === 0) {
    return [];
  }

  const fields: FormField[] = [];
  
  preset.userInputForm.forEach((item) => {
    const fieldType = Object.keys(item)[0];
    const fieldData = item[fieldType as keyof UserInput] as any;
    
    if (!fieldData) return;
    
    fields.push({
      type: fieldData.type || fieldType,
      variable: fieldData.variable,
      label: fieldData.label,
      required: !!fieldData.required,
      default: fieldData.default || '',
      max_length: fieldData.max_length,
      options: fieldData.options?.map((opt: any) => ({
        label: typeof opt === 'string' ? opt : opt.label || opt.name,
        value: typeof opt === 'string' ? opt : opt.value || opt.name
      }))
    });
  });
  
  return fields;
};

// 将组件改为使用 forwardRef
const ChatForm = forwardRef<ChatFormRef, ChatFormProps>(({ preset, onSubmit, inputText, onEntryVariableChange }, ref) => {
  const [form] = Form.useForm();
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  // 强制始终启用滚动条，这样可以确保内容过多时能够滚动
  const [needScroll, setNeedScroll] = useState(true);
  // 添加一个ref来跟踪之前的滚动状态，避免无限循环
  const prevScrollStateRef = useRef(false);
  // 添加调试计数器，帮助排查问题
  const checkScrollCountRef = useRef(0);
  
  // 使用 useMemo 计算表单字段，避免不必要的重新计算
  const formFields = useMemo(() => transformFields(preset), [preset]);
  
  // 检查是否有有效的表单 - 使用 useMemo 避免重复计算
  const hasValidForm = useMemo(() => formFields.length > 0, [formFields]);

  // 监听窗口大小变化，并设置表单最大高度
  useEffect(() => {
    const updateMaxHeight = () => {
      // 设置最大高度为窗口高度减去300px
      const windowHeight = window.innerHeight;
      console.log('windowHeight', windowHeight);
      setMaxHeight(windowHeight - 310);
    };

    // 初始计算
    updateMaxHeight();

    // 监听窗口大小变化
    window.addEventListener('resize', updateMaxHeight);

    // 清理监听器
    return () => {
      window.removeEventListener('resize', updateMaxHeight);
    };
  }, []);

  // 处理表单值变化，检测是否是入口变量变化
  const handleValuesChange = useCallback((changedValues: Record<string, any>, allValues: Record<string, any>) => {
    if (!preset?.inputFormEntryVariable || !onEntryVariableChange) return;
    
    // 检查是否是入口变量发生变化
    const entryVariable = preset.inputFormEntryVariable;
    if (entryVariable in changedValues) {
      const newValue = changedValues[entryVariable];
      // 确保传递字符串值
      onEntryVariableChange(typeof newValue === 'string' ? newValue : String(newValue || ''));
      
      console.log(`入口变量 ${entryVariable} 变化为:`, newValue);
    }
  }, [preset?.inputFormEntryVariable, onEntryVariableChange]);

  // 使用 useLayoutEffect 检测是否需要滚动
  useLayoutEffect(() => {
    if (!formContainerRef.current || maxHeight === null) return;
    
    const checkIfNeedScroll = () => {
      if (!formContainerRef.current) return;
      
      const formHeight = formContainerRef.current.scrollHeight;
      const shouldScroll = formHeight > maxHeight;
      
      checkScrollCountRef.current += 1;
      console.log(`检查滚动状态 [${checkScrollCountRef.current}]:`, {
        '表单高度': formHeight,
        '最大高度': maxHeight,
        '需要滚动': shouldScroll
      });
      
      // 强制启用滚动条，确保内容过多时能够滚动
      setNeedScroll(true);
      
      // 使用ref存储的上一个滚动状态来比较，而不是直接使用组件状态
      prevScrollStateRef.current = shouldScroll;
    };

    // 立即检查一次
    checkIfNeedScroll();

    // 创建一个ResizeObserver来监听表单内容变化
    const resizeObserver = new ResizeObserver(() => {
      // 使用requestAnimationFrame避免在浏览器渲染周期中多次触发
      requestAnimationFrame(() => {
        checkIfNeedScroll();
      });
    });

    // 确保对表单容器的引用存在
    if (formContainerRef.current) {
      resizeObserver.observe(formContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [maxHeight]); // 从依赖数组中移除needScroll，避免循环更新

  // 使用 useCallback 包装 getValues 和 submit 方法，确保它们的引用稳定性
  const getValues = useCallback(async () => {
    try {
      if (hasValidForm) {
        return await form.validateFields();
      }
      return {};
    } catch (errorInfo) {
      console.error('表单验证失败:', errorInfo);
      return {};
    }
  }, [form, hasValidForm]);

  const submitForm = useCallback(() => {
    if (hasValidForm) {
      form.submit();
    }
  }, [form, hasValidForm]);

  // 使用 useImperativeHandle 暴露方法给父组件，添加依赖数组
  useImperativeHandle(
    ref, 
    () => ({
      getValues,
      submit: submitForm
    }),
    [getValues, submitForm]
  );

  // 计算表单初始值 - 使用 useMemo 避免不必要的重新计算
  const initialValues = useMemo(() => {
    if (!hasValidForm) return {};
    
    const values: Record<string, any> = {};
    formFields.forEach(field => {
      // 如果该字段是预设的输入入口变量且提供了输入文本，则使用输入文本替代默认值
      if (preset.inputFormEntryVariable && field.variable === preset.inputFormEntryVariable && inputText) {
        values[field.variable] = inputText;
      } else {
        if (field.variable === preset.inputFormEntryVariable) {
          values[field.variable] = '';
        } else {
          values[field.variable] = field.default;
        }
      }
    });
    
    return values;
  }, [formFields, hasValidForm, preset.inputFormEntryVariable, inputText]);

  // 初始化表单字段值 - 只在初始值变化时执行
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      form.setFieldsValue(initialValues);
    }
  }, [form, initialValues]);

  // 当 inputText 变化时更新特定表单字段 - 与初始化表单值分离
  useEffect(() => {
    if (!preset?.inputFormEntryVariable || !inputText || !hasValidForm) return;
    
    const entryVariable = preset.inputFormEntryVariable;
    // 检查是否存在对应的表单字段
    const hasField = formFields.some(field => field.variable === entryVariable);
    if (hasField) {
      form.setFieldValue(entryVariable, inputText);
      // 如果已存在回调，则通知父组件值变化
      if (onEntryVariableChange) {
        onEntryVariableChange(inputText);
      }
    }
  }, [inputText, preset?.inputFormEntryVariable, formFields, hasValidForm, form, onEntryVariableChange]);

  // 使用 useCallback 包装 handleFinish 函数，避免不必要的重新创建
  const handleFinish = useCallback((values: Record<string, any>) => {
    if (onSubmit) {
      onSubmit(values);
    }
  }, [onSubmit]);

  // 使用 useCallback 包装 renderFormItem 函数，避免不必要的重新创建
  const renderFormItem = useCallback((field: FormField) => {
    const commonProps = {
      name: field.variable,
      label: (
        <Space>
          {field.label}
          {field.required && <span style={{ color: '#ff4d4f' }}>*</span>}
        </Space>
      ),
      rules: [
        {
          required: field.required,
          message: `请输入${field.label}`
        }
      ]
    };

    // 是否是入口变量对应的字段
    const isEntryField = preset?.inputFormEntryVariable === field.variable;
    const isHighlighted = isEntryField && !!inputText;

    switch (field.type) {
      case 'paragraph':
        return (
          <Form.Item key={field.variable} {...commonProps}>
            <TextArea 
              rows={4} 
              placeholder={`请输入${field.label}`}
              maxLength={field.max_length}
              showCount={!!field.max_length}
              className={isHighlighted ? 'highlighted-input' : ''}
            />
          </Form.Item>
        );
      
      case 'select':
        return (
          <Form.Item key={field.variable} {...commonProps}>
            <Select
              placeholder={`请选择${field.label}`}
              options={field.options || []}
              allowClear={!field.required}
              className={isHighlighted ? 'highlighted-input' : ''}
            />
          </Form.Item>
        );
      
      case 'number':
        return (
          <Form.Item key={field.variable} {...commonProps}>
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder={`请输入${field.label}`}
              className={isHighlighted ? 'highlighted-input' : ''}
            />
          </Form.Item>
        );
      
      case 'text-input':
      default:
        return (
          <Form.Item key={field.variable} {...commonProps}>
            <Input 
              placeholder={`请输入${field.label}`}
              maxLength={field.max_length}
              showCount={!!field.max_length}
              className={isHighlighted ? 'highlighted-input' : ''}
            />
          </Form.Item>
        );
    }
  }, [preset?.inputFormEntryVariable, inputText]);

  // 使用 useMemo 优化表单样式，避免不必要的重新计算
  const formStyle = useMemo(() => `
    .highlighted-input {
      border-color: #1677ff;
      box-shadow: 0 0 0 2px rgba(5, 145, 255, 0.1);
    }
    
    .chat-form-scrollable {
      overflow-y: auto !important;
      scrollbar-width: thin;
      padding-right: 8px;
    }

    .chat-form-scrollable::-webkit-scrollbar {
      width: 6px;
    }

    .chat-form-scrollable::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    .chat-form-scrollable::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }

    .chat-form-scrollable::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `, []);

  // 计算表单容器样式
  const formContainerStyle = useMemo(() => {
    if (!maxHeight) return {};
    
    // 强制启用滚动，确保内容超出时可以滚动
    return {
      maxHeight: `${maxHeight}px`,
      overflowY: 'auto' as const,
      paddingRight: '8px'
    };
  }, [maxHeight]);

  // 即使没有表单字段也渲染一个空的 Form，避免 useForm 实例未连接的警告
  return (
    <div className="chat-form" ref={formContainerRef}>
      <div 
        className="chat-form-scrollable"
        style={formContainerStyle}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
          onValuesChange={handleValuesChange}
        >
          {formFields.map(renderFormItem)}
          
          {onSubmit && formFields.length > 0 && (
            <Form.Item>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
            </Form.Item>
          )}
        </Form>
      </div>
      <style>{formStyle}</style>
    </div>
  );
});

export default ChatForm;
