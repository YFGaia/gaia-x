import { app } from 'electron';
import path from 'path';
import fs from 'fs';

interface ConfigOptions<T> {
  fileName: string;
  directory?: string;
  defaults?: T;
}

/**
 * 配置文件读取器
 * @param {ConfigOptions<T>} options 配置选项
 */
export class ConfigReader<T> {
  private filePath: string;
  private defaults: T;

  constructor(options: ConfigOptions<T>) {
    const { fileName, directory, defaults = {} as T } = options;

    this.filePath = path.join(directory || app.getPath('userData'), fileName);
    this.defaults = defaults;
  }

  async read(): Promise<T> {
    if (!fs.existsSync(this.filePath)) {
      await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.promises.writeFile(this.filePath, JSON.stringify(this.defaults, null, 2));
      return this.defaults;
    }
    const content = await fs.promises.readFile(this.filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  async write(data: Partial<T>): Promise<void> {
    const current = await this.read();
    const updated = { ...current, ...data } as T;
    await fs.promises.writeFile(this.filePath, JSON.stringify(updated, null, 2));
  }

  async get(key: string): Promise<any> {
    const config = await this.read();
    return (config as Record<string, any>)[key] || undefined;
  }

  async set(key: string, value: any): Promise<boolean> {
    const updateData = { [key]: value } as Partial<T>;
    await this.write(updateData);
    return true;
  }

  readSync(): T {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.defaults, null, 2), 'utf-8');
      return this.defaults;
    }
    const content = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  getSync(key: string): any {
    const config = this.readSync();
    return (config as Record<string, any>)[key] || undefined;
  }

}
