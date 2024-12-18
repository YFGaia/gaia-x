import { FieldName, TextInput } from '@/types/xKey/types'
import { Tooltip, Radio, Table, Input, Select, Empty, Card, Typography, Form } from 'antd'
import { useToolPresetStore } from '@/stores/ToolPresetStore'
import { useEffect } from 'react'
import './DifyFormTemplate.css'

const { Text } = Typography;

/**
 * Example of userInputForm
const userInputForm = [
  {
    "paragraph": { // 
      "variable": "query",
      "label": "query",
      "type": "paragraph",
      "max_length": 1024,
      "required": true,
      "options": []
    }
  },
  {
    "text-input": {
      "variable": "label",
      "label": "label",
      "type": "text-input",
      "max_length": 48,
      "required": true,
      "options": []
    }
  }
]
*/

// 新增Options渲染组件
const OptionsDisplay: React.FC<{
  options: string[];
}> = ({ options }) => {
  return options.length ? (
    <Text type="secondary" className="field-options">
      ({options.length})
    </Text>
  ) : null;
};

/** Dify 表单模板，用户输入可解析的 baseUrl 时启用 */
export const DifyFormTemplate: React.FC = () => {
  const { formData, handleFieldChange, errors } = useToolPresetStore()

  const userInputForm = formData?.userInputForm;
  const flatternUserInput: TextInput[] | undefined = userInputForm?.map(item => {
    const fieldName = Object.keys(item)[0] as FieldName;
    const fieldConfig = item[fieldName];
    fieldConfig.type = fieldName;
    return fieldConfig;
  });

  const inputFormEntryVariable = formData?.inputFormEntryVariable?? (
    flatternUserInput?.find(field => field.type === 'paragraph' || field.type === 'text-input')?.variable
  );

  useEffect(() => {
    if (inputFormEntryVariable) {
      handleFieldChange('inputFormEntryVariable', inputFormEntryVariable);
    }
  }, [inputFormEntryVariable, handleFieldChange])

  // 处理字段默认值变更
  const handleDefaultValueChange = (variable: string, value: string) => {
    const newUserInputForm = userInputForm?.map(item => {
      const fieldName = Object.keys(item)[0] as FieldName;
      const fieldConfig = { ...item[fieldName] };
      if (fieldConfig.variable === variable) {
        fieldConfig.default = value;
        return { [fieldName]: fieldConfig };
      }
      return item;
    });
    handleFieldChange('userInputForm', newUserInputForm);
  };

  // 表格列定义
  const columns = [
    {
      title: '字段名称',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: TextInput) => (
        <Tooltip title={text}>
          <div>{text} {record.required && <span className="required">*</span>}</div>
        </Tooltip>
      ),
    },
    {
      title: '字段类型',
      dataIndex: 'type',
      key: 'type',
      render: (_: string, record: TextInput) => (
        <Tooltip title={record.options?.length ? `选项: ${record.options.join(', ')}` : undefined}>
          <div>
            {record.type}
            {record.options && <OptionsDisplay options={record.options} />}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '默认值',
      dataIndex: 'default',
      key: 'default',
      render: (_: string, record: TextInput) => (
        record.type === 'select' ? (
          <Select
            value={record.default ?? ''}
            onChange={(value) => handleDefaultValueChange(record.variable, value)}
            style={{ width: '100%' }}
          >
            {record.options?.map((option, index) => (
              <Select.Option value={option} key={index}>{option}</Select.Option>
            ))}
          </Select>
        ) : (
          <Input
            value={record.default ?? ''}
            type={record.type === 'number' ? 'number' : 'text'}
            onChange={(e) => handleDefaultValueChange(record.variable, e.target.value)}
            placeholder="输入默认值"
          />
        )
      ),
    },
    {
      title: '划词填入',
      dataIndex: 'selection',
      key: 'selection',
      render: (_: string, record: TextInput) => (
        record.type !== 'select' && (
          <Radio
            checked={inputFormEntryVariable === record.variable}
            onChange={() => handleFieldChange('inputFormEntryVariable', record.variable)}
          />
        )
      ),
    },
  ];

  // API地址输入框组件
  const ApiUrlInput = () => (
    <Form.Item 
      label={<Tooltip title="API地址，用于与AI模型通信">🔗 API地址</Tooltip>}
      validateStatus={errors.baseUrl ? 'error' : undefined}
      help={errors.baseUrl}
    >
      <Input
        value={formData?.baseUrl}
        onChange={e => handleFieldChange('baseUrl', e.target.value)}
        placeholder="https://api.example.com"
      />
    </Form.Item>
  );

  if (!userInputForm || userInputForm.length === 0) {
    return (
      <Form layout="vertical">
        <ApiUrlInput />
        <Card className="dify-form-container">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="使用盖亚系统默认对话模板"
          />
        </Card>
      </Form>
    );
  }

  return (
    <Form layout="vertical">
      <ApiUrlInput />
      <Card className="dify-form-container" variant='outlined'>
        <Table
          columns={columns}
          dataSource={flatternUserInput}
          pagination={false}
          size="small"
          rowKey="variable"
          bordered
        />
      </Card>
    </Form>
  );
};