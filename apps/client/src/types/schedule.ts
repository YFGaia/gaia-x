import { SettingFilled } from '@ant-design/icons';

interface BaseSchedule {
    code: string;
    name: string;
    description: string;
    icon: React.FC;
}

export interface Schedule extends BaseSchedule {
    items: ScheduleItem[];
  }
  
  export interface ScheduleItem extends BaseSchedule {
    id: string;
  }

export const mcpToolSchedule: BaseSchedule = {
    code: 'mcpToolSchedule',
    name: 'MCP工具初始化任务',
    description: 'MCP工具初始化任务, 用于初始化MCP工具',
    icon: SettingFilled,
  };
  