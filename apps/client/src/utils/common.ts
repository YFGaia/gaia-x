/**
 * 生成唯一ID
 * @param prefix 前缀
 * @returns 唯一ID
 */
export function generateUniqueId(prefix?: string): string {
  const parts = [Date.now(), Math.random().toString(36).slice(2, 11)];

  return prefix ? [prefix, ...parts].join('-') : parts.join('-');
}

export function getTime() {
  return Date.now();
}

export const isMacOS = () => {
  return process.platform === 'darwin';
};

export const isWindows = () => {
  return process.platform === 'win32';
};

export const isLinux = () => {
  return process.platform === 'linux';
};

export const isDev = () => {
  return process.env.NODE_ENV === 'development';
};
