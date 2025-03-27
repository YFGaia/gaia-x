import { QuestionCircleOutlined } from '@ant-design/icons';
import { SelectLang as UmiSelectLang } from '@umijs/max';

export type SiderTheme = 'light' | 'dark';

export const SelectLang = () => {
  return <UmiSelectLang />;
};

export const Question = () => {
  return (
    <div
      style={{
        display: 'flex',
        height: 26,
      }}
      onClick={() => {
        window.open('https://alidocs.dingtalk.com/i/nodes/XPwkYGxZV3RXmAj2U0y4w6RnWAgozOKL');
      }}
    >
      <QuestionCircleOutlined />
    </div>
  );
};
