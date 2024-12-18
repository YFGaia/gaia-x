import { Schedule, ScheduleItem } from '@/types/schedule';
import { create } from 'zustand';

interface ScheduleStore {
  schedules: Schedule[];
  percent: number;
  addSchedule: (schedule: ScheduleItem) => void;
  removeSchedule: (id: string) => void;
  getSchedule: (code: string) => Schedule | undefined;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  percent: 70,
  addSchedule: (schedule: ScheduleItem) => {
    set((state) => {
      const scheduleItem: Schedule = {
        code: schedule.code,
        name: schedule.name,
        description: schedule.description,
        icon: schedule.icon,
        items: [schedule],
      };
      let percent = 0;
      let isExist = false;
      for (const scheduleVal of state.schedules) {
        if (scheduleVal.code === schedule.code) {
          scheduleVal.items = scheduleVal.items ? [...scheduleVal.items, schedule] : [schedule];
          isExist = true;
        }
        if (scheduleVal.items) {
          percent += scheduleVal.items.length;
        }
      }
      percent++;
      if (!isExist) {
        return {
          schedules: [...state.schedules, scheduleItem],
          percent: percent ? 1 / percent : 100,
        };
      }
      return {
        schedules: [...state.schedules],
        percent: percent ? 1 / percent : 100,
      };
    });
  },
  removeSchedule: (id: string) => {
    set((state) => {
      let percent = 0;
      for (const schedule of state.schedules) {
        if (schedule.items && schedule.items.some((item) => item.id === id)) {
          schedule.items = schedule.items.filter((item) => item.id !== id);
        }
        if (!schedule.items || schedule.items.length === 0) {
          state.schedules = state.schedules.filter((s) => s.code !== schedule.code);
        }
        if (schedule.items) {
          percent += schedule.items.length;
        }
      }
      return {
        schedules: state.schedules,
        percent: percent ? 1 / percent : 100,
      };
    });
  },
  getSchedule: (code: string) => {
    return get().schedules.find((schedule) => schedule.code === code);
  },
}));
