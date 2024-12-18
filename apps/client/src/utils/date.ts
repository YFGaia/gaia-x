// utils/date.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 扩展dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

export class DateTime {
  private static instance: DateTime;
  private constructor() {}

  public static getInstance(): DateTime {
    if (!DateTime.instance) {
      DateTime.instance = new DateTime();
    }
    return DateTime.instance;
  }

  // 获取当前时间
  public now() {
    return dayjs();
  }

  // 获取当前时间戳
  public timestamp() {
    return dayjs().valueOf();
  }

  // 获取ISO格式时间
  public isoString() {
    return dayjs().toISOString();
  }

  // 获取SQL格式时间
  public sqlString() {
    return dayjs().format('YYYY-MM-DD HH:mm:ss');
  }

  // 格式化时间
  public format(date: Date | string | number, format: string = 'YYYY-MM-DD HH:mm:ss') {
    return dayjs(date).format(format);
  }

  // 获取指定时区的时间
  public timezone(timezone: string) {
    return dayjs().tz(timezone);
  }

  // 时间比较
  public isBefore(date: Date | string | number) {
    return dayjs().isBefore(date);
  }

  public isAfter(date: Date | string | number) {
    return dayjs().isAfter(date);
  }

  // 时间计算
  public add(amount: number, unit: dayjs.ManipulateType) {
    return dayjs().add(amount, unit);
  }

  public subtract(amount: number, unit: dayjs.ManipulateType) {
    return dayjs().subtract(amount, unit);
  }
}

// 导出单例
export const dateTime = DateTime.getInstance();