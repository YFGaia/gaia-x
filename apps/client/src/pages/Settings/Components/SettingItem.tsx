import { useSettingStore } from '@/stores/SettingStore';
import { Checkbox, Form, Input, InputNumber, Radio, Slider, Switch } from 'antd';

export interface SettingItemProps {
  schema: Record<string, any>;
  settings: Record<string, any>;
}

const SettingItem: React.FC<SettingItemProps> = ({ schema, settings }) => {
  const { setSetting } = useSettingStore();
  const onChange = (changedFields: any) => {
    for (const key in changedFields) {
      setSetting(key, changedFields[key]);
    }
  };

  return (
    <Form initialValues={settings} onValuesChange={onChange}>
      {Object.entries(schema).map(([key, value]) => {
        return (
          <Form.Item label={value.title} name={key} key={key} tooltip={value.description}>
            {value.inputType === 'string' && <Input value={settings[key]} />}
            {value.inputType === 'number' && <InputNumber value={settings[key]} />}
            {value.inputType === 'boolean' && <Checkbox value={settings[key]} />}
            {value.inputType === 'textarea' && <Input.TextArea value={settings[key]} className='!min-h-[400px]'/>}
            {value.inputType === 'radio' && (
              <Radio.Group value={settings[key]} options={value.enum} />
            )}
            {value.inputType === 'checkbox' && (
              <Checkbox.Group value={settings[key]} options={value.enum} />
            )}
            {value.inputType === 'switch' && <Switch value={settings[key]} />}
            {value.inputType === 'slider' && (
              <Slider value={settings[key]} max={value.max} min={value.min} step={value.step} />
            )}
          </Form.Item>
        );
      })}
    </Form>
  );
};

export default SettingItem;
