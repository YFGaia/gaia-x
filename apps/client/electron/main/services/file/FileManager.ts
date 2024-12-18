import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

type FileType = 'text' | 'json';

function get(filePath: string, type: FileType = 'text'): string | object {
  try {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.env.APP_ROOT!, filePath);

    if (!existsSync(absolutePath)) {
      return type === 'json' ? {} : '';
    }

    const content = readFileSync(absolutePath, 'utf-8');
    
    if (type === 'json') {
      try {
        return JSON.parse(content);
      } catch (jsonError) {
        console.error('JSON解析失败:', jsonError);
        return {};
      }
    }
    
    return content;
  } catch (error) {
    console.error('读取文件失败:', error);
    return type === 'json' ? {} : '';
  }
}

function set(filePath: string, content: string | object, type: FileType = 'text'): boolean {
  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.env.APP_ROOT!, filePath);

    const finalContent = type === 'json' 
      ? JSON.stringify(content, null, 2)
      : content as string;

    writeFileSync(absolutePath, finalContent, 'utf-8');
    return true;
  } catch (error) {
    console.error('保存文件失败:', error);
    return false;
  }
}

export default {
  get,
  set,
};
  